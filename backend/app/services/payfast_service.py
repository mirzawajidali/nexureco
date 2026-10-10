"""PayFast (Pakistan, apps.net.pk) hosted checkout: cards, JazzCash, Easypaisa and bank accounts.

Flow: the order is placed with payment_method "payfast" -> start_payment() gets a one-time access token
(GetAccessToken) and returns the fields of a form the browser posts to PayFast's payment page
(PostTransaction) -> PayFast sends the customer back to the return URL and notifies the IPN URL; both
go through handle_callback(), which only trusts a callback whose validation_hash checks out.

Field names follow PayFast's merchant integration guide as used by public integrations; the official
guide is behind the merchant portal, so confirm them against it during UAT testing before going live.
"""
import hashlib
import hmac
import logging
import secrets
import time
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.order import Order, OrderStatusHistory

logger = logging.getLogger(__name__)
settings = get_settings()

TOKEN_PATH = "/Ecommerce/api/Transaction/GetAccessToken"
CHECKOUT_PATH = "/Ecommerce/api/Transaction/PostTransaction"
# Integrations disagree on the success code ("000" vs "00"); both mean the payment went through
SUCCESS_CODES = {"000", "00"}


def _amount(order: Order) -> str:
    return f"{float(order.total):.2f}"


def basket_id(order: Order) -> str:
    """Unique per payment attempt (PayFast may refuse a repeated basket id), and carries the order number."""
    return f"{order.order_number}-{int(time.time()) % 1_000_000}"


def order_number_from_basket(basket: str) -> str:
    return basket.rsplit("-", 1)[0]


async def _access_token(basket: str, amount: str) -> str:
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(
            f"{settings.PAYFAST_BASE_URL.rstrip('/')}{TOKEN_PATH}",
            data={
                "MERCHANT_ID": settings.PAYFAST_MERCHANT_ID,
                "SECURED_KEY": settings.PAYFAST_SECURED_KEY,
                "BASKET_ID": basket,
                "TXNAMT": amount,
                "CURRENCY_CODE": "PKR",
            },
        )
    res.raise_for_status()
    token = res.json().get("ACCESS_TOKEN")
    if not token:
        raise ValueError(f"PayFast returned no ACCESS_TOKEN: {res.text[:200]}")
    return token


async def start_payment(db: AsyncSession, order_number: str) -> dict:
    """The form (action URL + fields) the browser posts to open PayFast's payment page for this order."""
    if not settings.payfast_enabled:
        raise BadRequestException("Online payment isn't available right now")
    order = (await db.execute(select(Order).where(Order.order_number == order_number))).scalar_one_or_none()
    if not order or order.payment_method != "payfast":
        raise NotFoundException("Order not found")
    if order.payment_status == "paid":
        raise BadRequestException("This order is already paid")
    if order.status in ("cancelled", "returned"):
        raise BadRequestException("This order was cancelled")

    basket, amount = basket_id(order), _amount(order)
    try:
        token = await _access_token(basket, amount)
    except Exception:
        logger.exception("PayFast access token failed for %s", order.order_number)
        raise BadRequestException("We couldn't reach the payment provider. Please try again in a minute.")

    api = f"{settings.SITE_URL.rstrip('/')}/api/v1/payments/payfast"
    db.add(OrderStatusHistory(order_id=order.id, status=order.status, note=f"Online payment started ({basket})"))
    return {
        "action": f"{settings.PAYFAST_BASE_URL.rstrip('/')}{CHECKOUT_PATH}",
        "fields": {
            "MERCHANT_ID": settings.PAYFAST_MERCHANT_ID,
            "MERCHANT_NAME": settings.PAYFAST_MERCHANT_NAME,
            "TOKEN": token,
            "PROCCODE": "00",
            "TXNAMT": amount,
            "CURRENCY_CODE": "PKR",
            "BASKET_ID": basket,
            "ORDER_DATE": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "TXNDESC": f"Order {order.order_number}",
            "CUSTOMER_MOBILE_NO": order.shipping_phone or "",
            "CUSTOMER_EMAIL_ADDRESS": order.guest_email or "",
            "SUCCESS_URL": f"{api}/return",
            "FAILURE_URL": f"{api}/return",
            "CHECKOUT_URL": f"{api}/ipn",
            "SIGNATURE": secrets.token_hex(8),
            "VERSION": "MERCHANT-CART-0.1",
            "TRAN_TYPE": "ECOMM_PURCHASE",
        },
    }


def valid_hash(params: dict) -> bool:
    """validation_hash = SHA-256 of "basket_id|secured_key|merchant_id|err_code"."""
    expected = hashlib.sha256(
        f"{params.get('basket_id', '')}|{settings.PAYFAST_SECURED_KEY}|{settings.PAYFAST_MERCHANT_ID}|{params.get('err_code', '')}".encode()
    ).hexdigest()
    return hmac.compare_digest(expected, str(params.get("validation_hash", "")).lower())


async def handle_callback(db: AsyncSession, params: dict) -> tuple[Order | None, bool]:
    """Apply a return or IPN callback. Returns (order, paid); (None, False) when it can't be trusted."""
    if not settings.payfast_enabled or not params.get("basket_id") or not valid_hash(params):
        logger.warning("Rejected PayFast callback: %s", {k: v for k, v in params.items() if k != "validation_hash"})
        return None, False

    order = (await db.execute(
        select(Order).options(selectinload(Order.items), selectinload(Order.user))
        .where(Order.order_number == order_number_from_basket(params["basket_id"]))
    )).scalar_one_or_none()
    if not order or order.payment_method != "payfast":
        return None, False

    paid = str(params.get("err_code", "")) in SUCCESS_CODES
    amount = params.get("transaction_amount") or params.get("txnamt")
    if paid and amount is not None:
        try:
            if abs(float(amount) - float(order.total)) > 0.01:
                logger.error("PayFast amount %s doesn't match order %s total %s", amount, order.order_number, order.total)
                paid = False
        except ValueError:
            paid = False

    if order.payment_status == "paid":
        return order, True  # the IPN and the browser return both arrive; the first one already applied it

    txn = params.get("transaction_id") or "-"
    if paid:
        from app.services.order_service import _send_order_status_email  # avoids a circular import

        order.payment_status = "paid"
        note = f"Paid online with PayFast (transaction {txn})"
        if order.status == "pending":
            order.status = "confirmed"  # prepaid: no cash-on-delivery confirmation needed
        db.add(OrderStatusHistory(order_id=order.id, status=order.status, note=note))
        await db.flush()
        await _send_order_status_email(order, order.status, "Payment received")
    else:
        message = str(params.get("err_msg") or "not completed")[:200]
        db.add(OrderStatusHistory(order_id=order.id, status=order.status, note=f"Online payment failed: {message}"))
        await db.flush()
    return order, paid
