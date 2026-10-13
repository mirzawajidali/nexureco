import re
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update, delete
from app.models.coupon import Coupon, CouponUsage
from app.models.order import Order
from app.core.exceptions import BadRequestException
from app.core.store import WELCOME_COUPON_CODE, format_price


def _unavailable_reason(coupon: Coupon) -> str | None:
    """Why an active coupon can't be used right now (not started, expired, used up), or None."""
    now = datetime.now(timezone.utc)

    if coupon.starts_at and coupon.starts_at.replace(tzinfo=timezone.utc) > now:
        return "Coupon is not yet active"

    if coupon.expires_at and coupon.expires_at.replace(tzinfo=timezone.utc) < now:
        return "Coupon has expired"

    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        return "Coupon usage limit reached"

    return None


async def _customer_uses(
    db: AsyncSession, coupon_id: int, user_id: int | None, email: str | None, phone: str | None
) -> int:
    """Orders (not cancelled) that used this coupon, matched by account, email or phone so guest orders count too."""
    match = []
    if user_id is not None:
        match.append(Order.user_id == user_id)
    if email:
        match.append(func.lower(Order.guest_email) == email.strip().lower())
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) >= 10:
        # Compare the last 10 digits, so 0300 1234567 and +92 300 1234567 are the same customer
        stored = func.replace(func.replace(func.replace(Order.shipping_phone, " ", ""), "-", ""), "+", "")
        match.append(func.substr(stored, -10) == digits[-10:])
    if not match:
        return 0

    result = await db.execute(
        select(func.count(Order.id)).where(
            Order.coupon_id == coupon_id, Order.status != "cancelled", or_(*match)
        )
    )
    return result.scalar() or 0


async def validate_coupon(
    db: AsyncSession,
    code: str,
    user_id: int | None,
    subtotal: float,
    email: str | None = None,
    phone: str | None = None,
) -> dict:
    """Validate a coupon and return discount info."""
    result = await db.execute(
        select(Coupon).where(Coupon.code == code.strip().upper(), Coupon.is_active == True)
    )
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise BadRequestException("Invalid coupon code")

    reason = _unavailable_reason(coupon)
    if reason:
        raise BadRequestException(reason)

    if await _customer_uses(db, coupon.id, user_id, email, phone) >= (coupon.usage_per_customer or 1):
        raise BadRequestException("You have already used this coupon")

    if float(coupon.min_order_amount) > subtotal:
        raise BadRequestException(
            f"Minimum order amount of Rs. {int(coupon.min_order_amount)} required"
        )

    # Calculate discount
    if coupon.type == "percentage":
        discount = subtotal * (float(coupon.value) / 100)
        if coupon.max_discount:
            discount = min(discount, float(coupon.max_discount))
    else:
        discount = float(coupon.value)

    discount = min(discount, subtotal)

    return {
        "coupon_id": coupon.id,
        "code": coupon.code,
        "type": coupon.type,
        "value": float(coupon.value),
        "discount_amount": round(discount, 2),
        "description": coupon.description,
    }


async def get_welcome_offer(db: AsyncSession) -> dict | None:
    """The sign-up coupon for the welcome email, or None when there's no offer or it can't be used right now."""
    if not WELCOME_COUPON_CODE:
        return None
    result = await db.execute(
        select(Coupon).where(Coupon.code == WELCOME_COUPON_CODE, Coupon.is_active == True)
    )
    coupon = result.scalar_one_or_none()
    if not coupon or _unavailable_reason(coupon):
        return None

    if coupon.type == "percentage":
        headline = f"{float(coupon.value):g}% off your first order"
    else:
        headline = f"{format_price(float(coupon.value))} off your first order"

    terms = ["Enter the code in your bag or at checkout."]
    if coupon.min_order_amount and float(coupon.min_order_amount) > 0:
        terms.append(f"Minimum order {format_price(float(coupon.min_order_amount))}.")
    if coupon.type == "percentage" and coupon.max_discount:
        terms.append(f"Up to {format_price(float(coupon.max_discount))} off.")
    if coupon.expires_at:
        terms.append(f"Valid until {coupon.expires_at.strftime('%d %b %Y')}.")
    terms.append("One use per customer.")

    return {"code": coupon.code, "headline": headline, "terms": " ".join(terms)}


async def record_coupon_usage(
    db: AsyncSession, coupon_id: int, user_id: int | None, order_id: int
) -> None:
    """Count a redemption. Guest orders have no account to link, but still count towards the usage limit."""
    if user_id is not None:
        db.add(CouponUsage(coupon_id=coupon_id, user_id=user_id, order_id=order_id))
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if coupon:
        coupon.used_count += 1
    await db.flush()


async def release_coupon_usage(db: AsyncSession, coupon_id: int, order_id: int) -> None:
    """Give back a cancelled order's coupon use: one off the usage count, and the customer can use it again
    (the per-customer check already ignores cancelled orders)."""
    await db.execute(delete(CouponUsage).where(CouponUsage.order_id == order_id))
    await db.execute(
        update(Coupon).where(Coupon.id == coupon_id, Coupon.used_count > 0)
        .values(used_count=Coupon.used_count - 1)
    )
