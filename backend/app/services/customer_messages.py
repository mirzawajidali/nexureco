"""Messages the store sends customers on WhatsApp.

For now admins send them with one click (the admin order page opens WhatsApp with the text ready);
the same texts can later go out automatically through the WhatsApp Cloud API.
"""
import re
from urllib.parse import quote

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.store import SITE_NAME, format_price
from app.models.order import Order
from app.models.product import Product
from app.services.order_confirmation import confirm_url

settings = get_settings()

MAX_REVIEW_LINKS = 5


def whatsapp_number(phone: str | None) -> str | None:
    """A Pakistani number as wa.me expects it (923001234567); None if it doesn't look like a mobile number.

    Same rules as toWhatsAppNumber() in frontend/src/utils/whatsapp.ts.
    """
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("0092"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = "92" + digits[1:]
    elif len(digits) == 10 and digits.startswith("3"):
        digits = "92" + digits
    return digits if len(digits) >= 11 else None


async def order_messages(db: AsyncSession, order: Order) -> dict:
    """Ready-to-send WhatsApp texts for an order (its items must be loaded)."""
    base_url = settings.SITE_URL.rstrip("/")
    name = (order.shipping_first_name or "").strip() or "there"
    messages = []

    # COD confirmation: the order summary and a link that moves it from pending to confirmed
    lines = [
        f"• {item.product_name}" + (f" ({item.variant_info})" if item.variant_info else "") + f" x {item.quantity}"
        for item in order.items
    ]
    confirm_text = (
        f"Hi {name}! Thank you for your {SITE_NAME} order {order.order_number}:\n"
        + "\n".join(lines)
        + f"\n\nTotal: {format_price(float(order.total))}, cash on delivery to {order.shipping_city}.\n\n"
        f"Please confirm your order so we can send it out:\n{confirm_url(order)}\n\n"
        "Need to change something? Just reply to this message."
    )
    messages.append({
        "kind": "confirm_order",
        "label": "Ask to confirm order",
        "text": confirm_text,
        "available": order.status == "pending",
        "reason": None if order.status == "pending" else "Only for orders still pending confirmation",
    })

    # Review request: once delivered, a review link per product (opens the form with the order filled in)
    product_ids = [item.product_id for item in order.items if item.product_id]
    slugs = dict((await db.execute(
        select(Product.id, Product.slug).where(Product.id.in_(product_ids), Product.status == "active")
    )).all()) if product_ids else {}
    links = []
    for item in order.items:
        slug = slugs.get(item.product_id)
        if slug and len(links) < MAX_REVIEW_LINKS:
            url = f"{base_url}/product/{slug}?review_order={quote(order.order_number)}#reviews"
            links.append(f"• {item.product_name}: {url}")
    review_text = (
        f"Hi {name}! Your {SITE_NAME} order {order.order_number} has been delivered. We hope you love it!\n\n"
        "Could you leave a quick review? It takes a minute, and photos are very welcome:\n"
        + "\n".join(links)
        + f"\n\nThank you!\nTeam {SITE_NAME}"
    )
    messages.append({
        "kind": "review_request",
        "label": "Ask for a review",
        "text": review_text,
        "available": order.status == "delivered" and bool(links),
        "reason": None if order.status == "delivered" else "Available once the order is delivered",
    })

    return {"phone": whatsapp_number(order.shipping_phone), "messages": messages}


def abandoned_cart_message(draft) -> str:
    """Reminder for a checkout that wasn't finished; its link restores the bag (/bag/<token>)."""
    base_url = settings.SITE_URL.rstrip("/")
    name = (draft.first_name or "").strip() or "there"
    lines = [
        f"• {line['name']}" + (f" ({line['variant_info']})" if line.get("variant_info") else "") + f" x {line['quantity']}"
        for line in (draft.items or [])
    ]
    return (
        f"Hi {name}! You left these in your {SITE_NAME} bag:\n"
        + "\n".join(lines)
        + f"\n\nYour bag is saved. Finish your order here (cash on delivery):\n{base_url}/bag/{draft.token}\n\n"
        "Any questions about sizes or delivery? Just reply to this message."
    )
