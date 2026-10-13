from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.core.dependencies import require_module
from app.models.user import User
from app.models.order import Order
from app.models.product import Product, ProductVariant

router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    admin: User = require_module("dashboard"),
    db: AsyncSession = Depends(get_db),
):
    # Revenue and order count over the same orders: the ones still counted as sales
    sold = Order.status.notin_(["cancelled", "returned"])
    row = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0), func.count(Order.id)).where(sold)
    )).one()
    total_revenue = float(row[0])
    total_orders = int(row[1])

    # Total customers
    customers_count = await db.execute(
        select(func.count(User.id)).where(User.role == "customer")
    )
    total_customers = customers_count.scalar()

    # Avg order value (cancelled/returned orders are in neither the revenue nor the count)
    avg_order = total_revenue / total_orders if total_orders > 0 else 0

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_customers": total_customers,
        "avg_order_value": round(avg_order, 2),
        "revenue_change": 0,
        "orders_change": 0,
        "customers_change": 0,
        "avg_order_value_change": 0,
    }


@router.get("/low-stock")
async def get_low_stock(
    admin: User = require_module("dashboard"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProductVariant)
        .options(selectinload(ProductVariant.product))
        .where(ProductVariant.stock_quantity <= ProductVariant.low_stock_threshold)
        .where(ProductVariant.is_active == True)
        .limit(20)
    )
    variants = result.scalars().all()
    return [
        {
            "id": v.id,
            "product_name": v.product.name if v.product else "Unknown",
            "variant_info": v.sku,
            "sku": v.sku,
            "stock_quantity": v.stock_quantity,
            "low_stock_threshold": v.low_stock_threshold,
        }
        for v in variants
    ]
