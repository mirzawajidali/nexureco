import csv
import io
import random
import string
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.core.dependencies import require_module
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.user import User
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.product import Product, ProductVariant, ProductImage
from app.services.variant_helpers import build_variant_info
from app.models.media import InventoryLog
from app.schemas.order import OrderOut, OrderListItem
from app.schemas.common import PaginatedResponse, MessageResponse
from app.utils.pagination import paginate
from app.services.order_service import _send_order_status_email

router = APIRouter(prefix="/admin/orders", tags=["Admin Orders"])


class OrderStatusUpdate(BaseModel):
    status: str
    note: str | None = None


class OrderTrackingUpdate(BaseModel):
    tracking_number: str
    tracking_url: str | None = None


class OrderNoteUpdate(BaseModel):
    admin_note: str


class AdminOrderItemCreate(BaseModel):
    product_id: int | None = None
    variant_id: int | None = None
    quantity: int = Field(ge=1)
    # For custom items (no product_id)
    custom_name: str | None = None
    custom_price: float | None = None


class AdminOrderCreate(BaseModel):
    items: list[AdminOrderItemCreate] = Field(min_length=1)
    customer_id: int | None = None
    shipping_first_name: str | None = None
    shipping_last_name: str | None = None
    shipping_phone: str | None = None
    shipping_address1: str | None = None
    shipping_address2: str | None = None
    shipping_city: str | None = None
    shipping_state: str | None = None
    shipping_postal_code: str | None = None
    shipping_country: str = "Pakistan"
    admin_note: str | None = None
    discount_amount: float = 0
    shipping_cost: float = 0


def _generate_order_number() -> str:
    num = "".join(random.choices(string.digits, k=8))
    return f"MB-{num}"


def _build_customer_name(order: Order) -> str | None:
    first = (order.shipping_first_name or "").strip()
    last = (order.shipping_last_name or "").strip()
    name = f"{first} {last}".strip()
    return name if name else None


@router.post("/create", response_model=OrderOut, status_code=201)
async def admin_create_order(
    data: AdminOrderCreate,
    admin: User = require_module("orders"),
    db: AsyncSession = Depends(get_db),
):
    order_items = []
    subtotal = 0.0

    for item_data in data.items:
        if item_data.product_id:
            # Product-based item
            prod_result = await db.execute(
                select(Product).options(selectinload(Product.images)).where(Product.id == item_data.product_id)
            )
            product = prod_result.scalar_one_or_none()
            if not product:
                raise BadRequestException(f"Product #{item_data.product_id} not found")

            unit_price = float(product.base_price)
            variant_info = None
            sku = product.sku
            image_url = None

            # Get primary image
            primary_img = next((img.url for img in product.images if img.is_primary), None)
            if not primary_img and product.images:
                primary_img = product.images[0].url
            image_url = primary_img

            if item_data.variant_id:
                var_result = await db.execute(
                    select(ProductVariant).where(ProductVariant.id == item_data.variant_id)
                )
                variant = var_result.scalar_one_or_none()
                if not variant:
                    raise BadRequestException(f"Variant #{item_data.variant_id} not found")
                if variant.stock_quantity < item_data.quantity:
                    raise BadRequestException(
                        f"Only {variant.stock_quantity} units available for variant #{item_data.variant_id}"
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
                variant.stock_quantity -= item_data.quantity
                db.add(InventoryLog(
                    variant_id=variant.id,
                    quantity_change=-item_data.quantity,
                    reason="order_placed",
                    note="Admin-created order",
                ))

            line_total = unit_price * item_data.quantity
            subtotal += line_total

            order_items.append({
                "product_id": product.id,
                "variant_id": item_data.variant_id,
                "product_name": product.name,
                "variant_info": variant_info,
                "sku": sku,
                "quantity": item_data.quantity,
                "unit_price": unit_price,
                "total_price": line_total,
                "image_url": image_url,
            })

            product.total_sold += item_data.quantity

        elif item_data.custom_name and item_data.custom_price is not None:
            # Custom item
            line_total = item_data.custom_price * item_data.quantity
            subtotal += line_total
            order_items.append({
                "product_id": None,
                "variant_id": None,
                "product_name": item_data.custom_name,
                "variant_info": None,
                "sku": None,
                "quantity": item_data.quantity,
                "unit_price": item_data.custom_price,
                "total_price": line_total,
                "image_url": None,
            })
        else:
            raise BadRequestException("Each item needs either product_id or custom_name + custom_price")

    # Fill customer info from user if customer_id provided
    shipping_first_name = data.shipping_first_name
    shipping_last_name = data.shipping_last_name
    shipping_phone = data.shipping_phone
    user_id = data.customer_id

    if data.customer_id:
        cust_result = await db.execute(select(User).where(User.id == data.customer_id))
        customer = cust_result.scalar_one_or_none()
        if customer:
            if not shipping_first_name:
                shipping_first_name = customer.first_name
            if not shipping_last_name:
                shipping_last_name = customer.last_name
            if not shipping_phone:
                shipping_phone = customer.phone

    total = subtotal - data.discount_amount + data.shipping_cost

    order = Order(
        order_number=_generate_order_number(),
        user_id=user_id,
        status="pending",
        payment_method="cod",
        payment_status="pending",
        subtotal=subtotal,
        shipping_cost=data.shipping_cost,
        discount_amount=data.discount_amount,
        tax_amount=0,
        total=max(total, 0),
        shipping_first_name=shipping_first_name,
        shipping_last_name=shipping_last_name,
        shipping_phone=shipping_phone,
        shipping_address1=data.shipping_address1,
        shipping_address2=data.shipping_address2,
        shipping_city=data.shipping_city,
        shipping_state=data.shipping_state,
        shipping_postal_code=data.shipping_postal_code,
        shipping_country=data.shipping_country,
        admin_note=data.admin_note,
    )
    db.add(order)
    await db.flush()

    for oi_data in order_items:
        db.add(OrderItem(order_id=order.id, **oi_data))

    db.add(OrderStatusHistory(
        order_id=order.id, status="pending", note="Order created by admin", created_by=admin.id,
    ))
    await db.flush()

    # Reload with relationships
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.status_history))
        .where(Order.id == order.id)
    )
    return result.scalar_one()


@router.get("/stats")
async def order_stats(
    admin: User = require_module("orders"),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Today's orders
    today_count = await db.execute(
        select(func.count()).select_from(Order).where(Order.created_at >= today_start)
    )
    # Today's items ordered
    today_items = await db.execute(
        select(func.coalesce(func.sum(OrderItem.quantity), 0)).select_from(OrderItem).join(Order).where(
            Order.created_at >= today_start
        )
    )
    # Returns (cancelled orders total)
    returns_total = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).select_from(Order).where(
            Order.status == "returned"
        )
    )
    # Orders fulfilled (shipped + delivered)
    fulfilled = await db.execute(
        select(func.count()).select_from(Order).where(
            Order.status.in_(["shipped", "delivered"])
        )
    )
    # Orders delivered
    delivered = await db.execute(
        select(func.count()).select_from(Order).where(Order.status == "delivered")
    )
    # Total orders
    total_orders = await db.execute(
        select(func.count()).select_from(Order)
    )

    return {
        "today_orders": today_count.scalar() or 0,
        "today_items": int(today_items.scalar() or 0),
        "returns_total": float(returns_total.scalar() or 0),
        "fulfilled": fulfilled.scalar() or 0,
        "delivered": delivered.scalar() or 0,
        "total_orders": total_orders.scalar() or 0,
    }


@router.get("/export")
async def export_orders(
    status: str | None = None,
    payment_status: str | None = None,
    q: str | None = None,
    admin: User = require_module("orders"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    if status:
        query = query.where(Order.status == status)
    if payment_status:
        query = query.where(Order.payment_status == payment_status)
    if q:
        search_term = f"%{q}%"
        query = query.where(
            or_(
                Order.order_number.ilike(search_term),
                Order.shipping_first_name.ilike(search_term),
                Order.shipping_last_name.ilike(search_term),
            )
        )

    result = await db.execute(query)
    orders = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Order", "Date", "Customer", "Total", "Payment Status", "Fulfillment Status", "Items", "Delivery Method"])
    for order in orders:
        name = _build_customer_name(order)
        item_count = len(order.items)
        writer.writerow([
            order.order_number,
            order.created_at.strftime("%Y-%m-%d %H:%M") if order.created_at else "",
            name or "",
            float(order.total),
            order.payment_status,
            order.status,
            f"{item_count} item{'s' if item_count != 1 else ''}",
            "Standard",
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders.csv"},
    )


@router.get("/", response_model=PaginatedResponse[OrderListItem])
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    payment_status: str | None = None,
    fulfillment: str | None = None,
    q: str | None = None,
    admin: User = require_module("orders"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Order).order_by(Order.created_at.desc())

    if status:
        query = query.where(Order.status == status)
    if payment_status:
        query = query.where(Order.payment_status == payment_status)
    if fulfillment == "unfulfilled":
        query = query.where(Order.status.in_(["pending", "confirmed", "processing"]))
    elif fulfillment == "fulfilled":
        query = query.where(Order.status.in_(["shipped", "delivered"]))
    if q:
        search_term = f"%{q}%"
        query = query.where(
            or_(
                Order.order_number.ilike(search_term),
                Order.shipping_first_name.ilike(search_term),
                Order.shipping_last_name.ilike(search_term),
            )
        )

    result = await paginate(db, query, page=page, page_size=page_size)

    # Batch-load item counts for all orders (1 query instead of N)
    orders = result["items"]
    order_ids = [o.id for o in orders]
    count_map = {}
    if order_ids:
        counts = await db.execute(
            select(OrderItem.order_id, func.count(OrderItem.id))
            .where(OrderItem.order_id.in_(order_ids))
            .group_by(OrderItem.order_id)
        )
        count_map = dict(counts.all())

    items = []
    for order in orders:
        items.append(
            OrderListItem(
                id=order.id,
                order_number=order.order_number,
                status=order.status,
                payment_status=order.payment_status,
                total=float(order.total),
                item_count=count_map.get(order.id, 0),
                customer_name=_build_customer_name(order),
                delivery_method="Standard",
                created_at=order.created_at,
            )
        )

    result["items"] = items
    return result


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: int,
    admin: User = require_module("orders"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("Order not found")
    return order


@router.put("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    admin: User = require_module("orders"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.user),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("Order not found")

    order.status = data.status

    # Record status history
    history = OrderStatusHistory(
        order_id=order.id,
        status=data.status,
        note=data.note,
        created_by=admin.id,
    )
    db.add(history)
    await db.flush()

    # Send status update email to customer
    _send_order_status_email(order, data.status, data.note)

    # Refresh to include the new history entry
    await db.refresh(order, attribute_names=["status_history", "items"])
    return order


@router.put("/{order_id}/tracking", response_model=OrderOut)
async def update_order_tracking(
    order_id: int,
    data: OrderTrackingUpdate,
    admin: User = require_module("orders"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("Order not found")

    order.tracking_number = data.tracking_number
    if data.tracking_url is not None:
        order.tracking_url = data.tracking_url

    await db.flush()
    await db.refresh(order, attribute_names=["items", "status_history"])
    return order


@router.put("/{order_id}/mark-paid", response_model=OrderOut)
async def mark_order_paid(
    order_id: int,
    admin: User = require_module("orders"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("Order not found")

    order.payment_status = "paid"

    # Record in status history
    history = OrderStatusHistory(
        order_id=order.id,
        status=order.status,
        note="Payment marked as paid",
        created_by=admin.id,
    )
    db.add(history)
    await db.flush()
    await db.refresh(order, attribute_names=["items", "status_history"])
    return order


@router.put("/{order_id}/note", response_model=OrderOut)
async def update_order_note(
    order_id: int,
    data: OrderNoteUpdate,
    admin: User = require_module("orders"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("Order not found")

    order.admin_note = data.admin_note
    await db.flush()
    await db.refresh(order, attribute_names=["items", "status_history"])
    return order
