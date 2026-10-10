"""Unfinished checkouts: saved when the customer enters their details, listed for WhatsApp reminders
on the admin page, and restored to the bag from the reminder's link (/bag/<token>)."""
import re
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.abandoned_checkout import AbandonedCheckout
from app.models.order import Order
from app.models.product import Product, ProductVariant
from app.services.customer_messages import abandoned_cart_message, whatsapp_number
from app.services.variant_helpers import build_variant_info

# Listed for a reminder once the customer has been gone this long
REMIND_AFTER = timedelta(minutes=30)
_TOKEN = re.compile(r"^[A-Za-z0-9-]{16,64}$")


class DraftLine(BaseModel):
    product_id: int
    variant_id: int | None = None
    quantity: int = Field(ge=1, le=20)


class CheckoutDraftIn(BaseModel):
    first_name: str | None = Field(None, max_length=100)
    phone: str = Field(min_length=7, max_length=20)
    email: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    items: list[DraftLine] = Field(min_length=1, max_length=30)


def _check_token(token: str) -> None:
    if not _TOKEN.match(token):
        raise BadRequestException("Invalid checkout id")


async def _current_lines(db: AsyncSession, lines: list[dict]) -> list[dict]:
    """Bag lines with today's name, price and photo; products or variants no longer for sale are dropped."""
    out = []
    for line in lines:
        product = (await db.execute(
            select(Product).options(selectinload(Product.images)).where(Product.id == line["product_id"])
        )).scalar_one_or_none()
        if not product or product.status != "active":
            continue
        price = float(product.base_price)
        image = next((img.url for img in product.images if img.is_primary), product.images[0].url if product.images else None)
        variant_info = None
        if line.get("variant_id"):
            variant = await db.get(ProductVariant, line["variant_id"])
            if not variant or not variant.is_active or variant.product_id != product.id:
                continue
            if variant.price is not None:
                price = float(variant.price)
            image = variant.image_url or image
            variant_info = await build_variant_info(db, variant.id)
        out.append({
            "product_id": product.id,
            "variant_id": line.get("variant_id"),
            "quantity": int(line["quantity"]),
            "name": product.name,
            "slug": product.slug,
            "variant_info": variant_info,
            "price": price,
            "image": image,
        })
    return out


async def save_draft(db: AsyncSession, token: str, data: CheckoutDraftIn, user_id: int | None) -> None:
    """Create or update the saved bag for this checkout (names and prices always come from the database)."""
    _check_token(token)
    lines = await _current_lines(db, [line.model_dump() for line in data.items])
    if not lines:
        return
    draft = (await db.execute(select(AbandonedCheckout).where(AbandonedCheckout.token == token))).scalar_one_or_none()
    if draft and draft.recovered_order_id:
        return  # already turned into an order
    if not draft:
        draft = AbandonedCheckout(token=token)
        db.add(draft)
    draft.user_id = user_id
    draft.first_name = (data.first_name or "").strip() or None
    draft.phone = data.phone.strip()
    draft.email = (data.email or "").strip() or None
    draft.city = (data.city or "").strip() or None
    draft.items = lines
    draft.subtotal = sum(line["price"] * line["quantity"] for line in lines)
    await db.flush()


async def restore_lines(db: AsyncSession, token: str) -> list[dict]:
    _check_token(token)
    draft = (await db.execute(select(AbandonedCheckout).where(AbandonedCheckout.token == token))).scalar_one_or_none()
    if not draft:
        raise NotFoundException("This bag link has expired")
    return await _current_lines(db, draft.items or [])


async def mark_recovered(db: AsyncSession, token: str | None, order_id: int) -> None:
    if not token or not _TOKEN.match(token):
        return
    draft = (await db.execute(select(AbandonedCheckout).where(AbandonedCheckout.token == token))).scalar_one_or_none()
    if draft and not draft.recovered_order_id:
        draft.recovered_order_id = order_id


def _phone_key(phone: str | None) -> str:
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:]


async def list_for_admin(db: AsyncSession, status: str = "open") -> list[dict]:
    """status: open (waiting for a reminder) | reminded | converted (ordered after all) | all."""
    now = datetime.now(timezone.utc)
    drafts = list((await db.execute(
        select(AbandonedCheckout).order_by(AbandonedCheckout.updated_at.desc()).limit(500)
    )).scalars())

    # A customer who ordered later (e.g. on another device) counts as converted
    since = min((d.created_at for d in drafts if d.created_at), default=now)
    recent_orders = (await db.execute(
        select(Order.shipping_phone, Order.created_at).where(Order.created_at >= since)
    )).all()
    ordered_at: dict[str, list[datetime]] = {}
    for phone, created in recent_orders:
        ordered_at.setdefault(_phone_key(phone), []).append(created)

    out = []
    for d in drafts:
        updated = d.updated_at if d.updated_at.tzinfo else d.updated_at.replace(tzinfo=timezone.utc)
        ordered_later = any(
            (t if t.tzinfo else t.replace(tzinfo=timezone.utc)) >= updated - timedelta(minutes=1)
            for t in ordered_at.get(_phone_key(d.phone), [])
        )
        if d.recovered_order_id or ordered_later:
            state = "converted"
        elif d.reminded_at:
            state = "reminded"
        elif now - updated >= REMIND_AFTER:
            state = "open"
        else:
            state = "active"  # still within REMIND_AFTER: they may be checking out right now
        if status != "all" and state != status:
            continue
        out.append({
            "id": d.id,
            "status": state,
            "first_name": d.first_name,
            "phone": d.phone,
            "whatsapp": whatsapp_number(d.phone),
            "email": d.email,
            "city": d.city,
            "items": d.items,
            "subtotal": float(d.subtotal),
            "updated_at": updated.isoformat(),
            "reminded_at": d.reminded_at.isoformat() if d.reminded_at else None,
            "message": abandoned_cart_message(d),
        })
    return out


async def mark_reminded(db: AsyncSession, draft_id: int) -> None:
    draft = await db.get(AbandonedCheckout, draft_id)
    if not draft:
        raise NotFoundException("Checkout not found")
    draft.reminded_at = datetime.now(timezone.utc)
