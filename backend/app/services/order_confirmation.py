"""Customers confirm cash-on-delivery orders with a private link.

The admin order page sends the link on WhatsApp (services/customer_messages.py); tapping
"Confirm my order" on /order/confirm moves a pending order to confirmed, so only orders the
customer has confirmed get dispatched (fewer fake orders and refused parcels).
"""
from datetime import datetime, timedelta, timezone

from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.security import decode_token
from app.models.order import Order, OrderStatusHistory

settings = get_settings()

# Its type isn't "access", so the token can never be used to sign in
CONFIRM_TOKEN_TYPE = "order_confirm"
CONFIRM_TOKEN_TTL = timedelta(days=7)
_INVALID_LINK = "This confirmation link is invalid or has expired. Please message us on WhatsApp."


def confirm_token(order_id: int) -> str:
    expires = datetime.now(timezone.utc) + CONFIRM_TOKEN_TTL
    return jwt.encode(
        {"type": CONFIRM_TOKEN_TYPE, "sub": str(order_id), "exp": expires},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def confirm_url(order: Order) -> str:
    return f"{settings.SITE_URL.rstrip('/')}/order/confirm?token={confirm_token(order.id)}"


async def order_for_token(db: AsyncSession, token: str) -> Order:
    payload = decode_token(token)
    if not payload or payload.get("type") != CONFIRM_TOKEN_TYPE or not str(payload.get("sub", "")).isdigit():
        raise NotFoundException(_INVALID_LINK)
    order = (await db.execute(
        select(Order).options(selectinload(Order.items), selectinload(Order.user)).where(Order.id == int(payload["sub"]))
    )).scalar_one_or_none()
    if not order:
        raise NotFoundException(_INVALID_LINK)
    return order


def confirmation_summary(order: Order) -> dict:
    """What the confirmation page shows: enough to recognise the order, no address beyond the city."""
    return {
        "order_number": order.order_number,
        "status": order.status,
        "first_name": order.shipping_first_name,
        "city": order.shipping_city,
        "items": [
            {
                "name": item.product_name,
                "variant_info": item.variant_info,
                "quantity": item.quantity,
                "total_price": float(item.total_price),
            }
            for item in order.items
        ],
        "shipping_cost": float(order.shipping_cost),
        "discount_amount": float(order.discount_amount),
        "total": float(order.total),
    }


async def confirm_order(db: AsyncSession, token: str) -> dict:
    """Confirm a pending order; confirming again (or after dispatch) just returns its current state."""
    from app.services.order_service import _send_order_status_email  # avoids a circular import

    order = await order_for_token(db, token)
    if order.status in ("cancelled", "returned"):
        raise BadRequestException(f"Order {order.order_number} was {order.status}. Please message us on WhatsApp.")
    if order.status == "pending":
        order.status = "confirmed"
        db.add(OrderStatusHistory(
            order_id=order.id, status="confirmed", note="Confirmed by the customer (WhatsApp link)",
        ))
        await db.flush()
        await _send_order_status_email(order, "confirmed")
    return confirmation_summary(order)
