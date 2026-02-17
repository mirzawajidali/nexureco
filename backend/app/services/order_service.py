import random
import string
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.cart import CartItem
from app.models.product import Product, ProductVariant, ProductImage
from app.services.variant_helpers import build_variant_info
from app.models.media import InventoryLog
from app.models.user import User
from app.schemas.order import CheckoutRequest, TrackOrderRequest
from app.services import coupon_service
from app.core.exceptions import BadRequestException, NotFoundException
from app.utils.pagination import paginate
from app.utils.email import send_email_background
from app.config import get_settings

_settings = get_settings()


def _generate_order_number() -> str:
    num = "".join(random.choices(string.digits, k=8))
    return f"MB-{num}"


def _build_shipping_address(order: Order) -> str:
    parts = [order.shipping_address1]
    if order.shipping_address2:
        parts.append(order.shipping_address2)
    parts.append(f"{order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}")
    parts.append(order.shipping_country or "")
    return ", ".join(p for p in parts if p)


def _build_order_email_context(order: Order, order_items: list[dict]) -> dict:
    customer_name = f"{order.shipping_first_name or ''} {order.shipping_last_name or ''}".strip()
    return {
        "order_number": order.order_number,
        "customer_name": customer_name or "Customer",
        "items": order_items,
        "subtotal": float(order.subtotal),
        "shipping_cost": float(order.shipping_cost),
        "discount_amount": float(order.discount_amount),
        "total": float(order.total),
        "item_count": len(order_items),
        "shipping_address": _build_shipping_address(order),
    }


def _send_order_confirmation(order: Order, order_items: list[dict], customer_email: str) -> None:
    ctx = _build_order_email_context(order, order_items)
    # Customer confirmation
    send_email_background(
        to=customer_email,
        subject=f"Order Confirmed — {order.order_number}",
        template_name="order_confirmation.html",
        context=ctx,
    )
    # Admin new-order alert
    ctx["customer_email"] = customer_email
    ctx["customer_phone"] = order.shipping_phone or ""
    send_email_background(
        to=_settings.EMAIL_FROM,
        subject=f"New Order — {order.order_number} (Rs. {float(order.total):.0f})",
        template_name="new_order_admin.html",
        context=ctx,
    )


def _get_order_customer_email(order: Order) -> str | None:
    if order.user_id:
        # Will be loaded if user relationship is available
        try:
            return order.user.email if order.user else None
        except Exception:
            return None
    return order.guest_email


def _send_order_status_email(
    order: Order,
    status: str,
    note: str | None = None,
    tracking_number: str | None = None,
    tracking_url: str | None = None,
) -> None:
    email = _get_order_customer_email(order)
    if not email:
        return

    customer_name = f"{order.shipping_first_name or ''} {order.shipping_last_name or ''}".strip() or "Customer"
    ctx = {
        "order_number": order.order_number,
        "customer_name": customer_name,
        "total": float(order.total),
        "item_count": sum(1 for _ in order.items) if order.items else 0,
        "reason": note,
    }

    templates = {
        "confirmed": ("order_confirmed.html", f"Order Confirmed — {order.order_number}"),
        "shipped": ("order_shipped.html", f"Your Order Is On Its Way — {order.order_number}"),
        "delivered": ("order_delivered.html", f"Order Delivered — {order.order_number}"),
        "cancelled": ("order_cancelled.html", f"Order Cancelled — {order.order_number}"),
    }

    if status not in templates:
        return

    template, subject = templates[status]

    if status == "shipped":
        ctx["tracking_number"] = tracking_number or order.tracking_number
        ctx["tracking_url"] = tracking_url or order.tracking_url

    send_email_background(to=email, subject=subject, template_name=template, context=ctx)


async def place_order(db: AsyncSession, user: User | None, data: CheckoutRequest) -> Order:
    order_items = []
    subtotal = 0

    for cart_item in data.items:
        prod_result = await db.execute(
            select(Product).options(selectinload(Product.images)).where(Product.id == cart_item.product_id)
        )
        product = prod_result.scalar_one_or_none()
        if not product or product.status != "active":
            raise BadRequestException(f"Product '{cart_item.product_id}' is no longer available")

        unit_price = float(product.base_price)
        variant_info = None
        sku = product.sku
        image_url = None

        # Get primary image
        primary_img = next((img.url for img in product.images if img.is_primary), None)
        if not primary_img and product.images:
            primary_img = product.images[0].url
        image_url = primary_img

        if cart_item.variant_id:
            var_result = await db.execute(
                select(ProductVariant).where(ProductVariant.id == cart_item.variant_id)
            )
            variant = var_result.scalar_one_or_none()
            if not variant or not variant.is_active:
                raise BadRequestException(f"Variant for '{product.name}' is no longer available")
            if variant.stock_quantity < cart_item.quantity:
                raise BadRequestException(
                    f"Only {variant.stock_quantity} units of '{product.name}' available"
                )
            if variant.price is not None:
                unit_price = float(variant.price)
            if variant.sku:
                sku = variant.sku
            if variant.image_url:
                image_url = variant.image_url

            # Build variant info (single JOIN query instead of nested loops)
            variant_info = await build_variant_info(db, variant.id)

            # Deduct inventory
            variant.stock_quantity -= cart_item.quantity
            db.add(InventoryLog(
                variant_id=variant.id,
                quantity_change=-cart_item.quantity,
                reason="order_placed",
                note=f"Order placed",
            ))

        line_total = unit_price * cart_item.quantity
        subtotal += line_total

        order_items.append({
            "product_id": product.id,
            "variant_id": cart_item.variant_id,
            "product_name": product.name,
            "variant_info": variant_info,
            "sku": sku,
            "quantity": cart_item.quantity,
            "unit_price": unit_price,
            "total_price": line_total,
            "image_url": image_url,
        })

        # Update product sold count
        product.total_sold += cart_item.quantity

    # Apply coupon
    discount_amount = 0
    coupon_id = None
    coupon_code = data.coupon_code
    if coupon_code:
        user_id_for_coupon = user.id if user else None
        coupon_info = await coupon_service.validate_coupon(db, coupon_code, user_id_for_coupon, subtotal)
        discount_amount = coupon_info["discount_amount"]
        coupon_id = coupon_info["coupon_id"]
        coupon_code = coupon_info["code"]

    # Calculate totals
    shipping_cost = 0 if subtotal >= 5000 else 200  # Free shipping over 5000
    total = subtotal - discount_amount + shipping_cost

    # Create order
    order = Order(
        order_number=_generate_order_number(),
        user_id=user.id if user else None,
        guest_email=data.guest_email if not user else None,
        status="pending",
        payment_method="cod",
        payment_status="pending",
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        discount_amount=discount_amount,
        tax_amount=0,
        total=total,
        coupon_id=coupon_id,
        coupon_code=coupon_code,
        shipping_first_name=data.shipping_first_name,
        shipping_last_name=data.shipping_last_name,
        shipping_phone=data.shipping_phone,
        shipping_address1=data.shipping_address1,
        shipping_address2=data.shipping_address2,
        shipping_city=data.shipping_city,
        shipping_state=data.shipping_state,
        shipping_postal_code=data.shipping_postal_code,
        shipping_country=data.shipping_country,
        customer_note=data.customer_note,
    )
    db.add(order)
    await db.flush()

    # Create order items
    for oi_data in order_items:
        db.add(OrderItem(order_id=order.id, **oi_data))

    # Status history
    db.add(OrderStatusHistory(order_id=order.id, status="pending", note="Order placed"))

    # Record coupon usage
    if coupon_id and user:
        await coupon_service.record_coupon_usage(db, coupon_id, user.id, order.id)

    # Clear DB cart if logged in
    if user:
        from sqlalchemy import delete
        await db.execute(delete(CartItem).where(CartItem.user_id == user.id))

    await db.flush()

    # Send order confirmation + admin alert emails
    customer_email = user.email if user else data.guest_email
    if customer_email:
        _send_order_confirmation(order, order_items, customer_email)

    # Reload with relationships
    return await get_order_by_id(db, order.id)


async def get_order_by_id(db: AsyncSession, order_id: int) -> Order:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.status_history))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("Order not found")
    return order


async def get_user_orders(db: AsyncSession, user_id: int, page: int = 1, page_size: int = 10) -> dict:
    query = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
    )
    result = await paginate(db, query, page, page_size)

    items = []
    for order in result["items"]:
        items.append({
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "total": float(order.total),
            "item_count": len(order.items),
            "created_at": order.created_at,
        })
    result["items"] = items
    return result


async def get_order_by_number(db: AsyncSession, order_number: str, user_id: int | None = None) -> Order:
    query = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.status_history))
        .where(Order.order_number == order_number)
    )
    if user_id:
        query = query.where(Order.user_id == user_id)
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("Order not found")
    return order


async def cancel_order(db: AsyncSession, order_number: str, user_id: int) -> Order:
    order = await get_order_by_number(db, order_number, user_id)
    if order.status not in ("pending", "confirmed"):
        raise BadRequestException("Order cannot be cancelled at this stage")

    order.status = "cancelled"
    order.cancelled_at = datetime.now(timezone.utc)

    # Restore inventory
    for item in order.items:
        if item.variant_id:
            var_result = await db.execute(
                select(ProductVariant).where(ProductVariant.id == item.variant_id)
            )
            variant = var_result.scalar_one_or_none()
            if variant:
                variant.stock_quantity += item.quantity
                db.add(InventoryLog(
                    variant_id=variant.id,
                    quantity_change=item.quantity,
                    reason="order_cancelled",
                    reference_id=order.id,
                    note=f"Order {order.order_number} cancelled",
                ))

    db.add(OrderStatusHistory(
        order_id=order.id, status="cancelled", note="Cancelled by customer"
    ))
    await db.flush()

    # Send cancellation email
    _send_order_status_email(order, "cancelled", "Cancelled by customer")

    return await get_order_by_id(db, order.id)


async def track_order(db: AsyncSession, data: TrackOrderRequest) -> Order:
    """Public order tracking — verifies email matches the order owner."""
    query = (
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.user),
        )
        .where(Order.order_number == data.order_number)
    )
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("No order found with this order number and email")

    # Verify email matches either the registered user's email or guest_email
    email_lower = data.email.lower()
    owner_email = None
    if order.user:
        owner_email = order.user.email.lower() if order.user.email else None
    guest_email = order.guest_email.lower() if order.guest_email else None

    if email_lower != owner_email and email_lower != guest_email:
        raise NotFoundException("No order found with this order number and email")

    return order
