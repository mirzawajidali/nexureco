from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from app.db.database import get_db
from app.core.dependencies import require_module
from app.models.user import User
from app.models.product import Product, ProductImage, ProductVariant
from app.models.order import Order

router = APIRouter(prefix="/admin/search", tags=["Admin Search"])


@router.get("/")
async def admin_search(
    q: str = Query("", min_length=0),
    admin: User = require_module("dashboard"),
    db: AsyncSession = Depends(get_db),
):
    """Search across products, orders, and customers for the admin search bar."""
    q = q.strip()
    if not q:
        return {"products": [], "orders": [], "customers": [], "products_count": 0, "orders_count": 0, "customers_count": 0}

    like = f"%{q}%"

    # --- Products (limit 5, count total) ---
    product_where = or_(
        Product.name.ilike(like),
        Product.sku.ilike(like),
    )
    products_count = (await db.execute(
        select(func.count()).select_from(Product).where(product_where)
    )).scalar() or 0

    products_result = await db.execute(
        select(Product)
        .where(product_where)
        .order_by(Product.created_at.desc())
        .limit(5)
    )
    products = products_result.scalars().all()

    # Get primary images for products
    product_ids = [p.id for p in products]
    images_map: dict[int, str | None] = {}
    if product_ids:
        images_result = await db.execute(
            select(ProductImage)
            .where(
                ProductImage.product_id.in_(product_ids),
                ProductImage.is_primary == True,
            )
        )
        for img in images_result.scalars().all():
            images_map[img.product_id] = img.url

    # Get variant counts for products
    variant_counts: dict[int, int] = {}
    if product_ids:
        vc_result = await db.execute(
            select(
                ProductVariant.product_id,
                func.count(ProductVariant.id).label("cnt"),
            )
            .where(ProductVariant.product_id.in_(product_ids))
            .group_by(ProductVariant.product_id)
        )
        for row in vc_result.all():
            variant_counts[row[0]] = row[1]

    products_data = [
        {
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "base_price": float(p.base_price),
            "status": p.status,
            "image_url": images_map.get(p.id),
            "variant_count": variant_counts.get(p.id, 0),
        }
        for p in products
    ]

    # --- Orders (limit 5, count total) ---
    order_where = or_(
        Order.order_number.ilike(like),
        Order.shipping_first_name.ilike(like),
        Order.shipping_last_name.ilike(like),
        Order.guest_email.ilike(like),
    )
    # Also search by order number without '#' prefix
    q_stripped = q.lstrip("#")
    if q_stripped != q:
        order_where = or_(
            order_where,
            Order.order_number.ilike(f"%{q_stripped}%"),
        )

    orders_count = (await db.execute(
        select(func.count()).select_from(Order).where(order_where)
    )).scalar() or 0

    orders_result = await db.execute(
        select(Order)
        .where(order_where)
        .order_by(Order.created_at.desc())
        .limit(5)
    )
    orders = orders_result.scalars().all()

    orders_data = [
        {
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "payment_status": o.payment_status,
            "total": float(o.total),
            "customer_name": f"{o.shipping_first_name or ''} {o.shipping_last_name or ''}".strip() or o.guest_email or "Guest",
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]

    # --- Customers (limit 5, count total) ---
    customer_where = or_(
        User.first_name.ilike(like),
        User.last_name.ilike(like),
        User.email.ilike(like),
    )
    # Only search actual customers (not admins)
    base_customer = select(User).where(User.role == "customer", customer_where)

    customers_count = (await db.execute(
        select(func.count()).select_from(base_customer.subquery())
    )).scalar() or 0

    customers_result = await db.execute(
        base_customer.order_by(User.created_at.desc()).limit(5)
    )
    customers = customers_result.scalars().all()

    # Get order counts per customer
    customer_ids = [c.id for c in customers]
    order_counts: dict[int, int] = {}
    if customer_ids:
        oc_result = await db.execute(
            select(
                Order.user_id,
                func.count(Order.id).label("cnt"),
            )
            .where(Order.user_id.in_(customer_ids))
            .group_by(Order.user_id)
        )
        for row in oc_result.all():
            order_counts[row[0]] = row[1]

    customers_data = [
        {
            "id": c.id,
            "name": f"{c.first_name} {c.last_name}",
            "email": c.email,
            "orders_count": order_counts.get(c.id, 0),
        }
        for c in customers
    ]

    return {
        "products": products_data,
        "orders": orders_data,
        "customers": customers_data,
        "products_count": products_count,
        "orders_count": orders_count,
        "customers_count": customers_count,
    }
