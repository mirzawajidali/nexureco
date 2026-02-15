from datetime import date, datetime, timedelta
from typing import Literal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from app.core.dependencies import require_module
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.product import Product

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


@router.get("/dashboard")
async def get_analytics_dashboard(
    period: Literal["today", "7d", "30d", "90d", "12m"] = "30d",
    admin: User = require_module("analytics"),
    db: AsyncSession = Depends(get_db),
):
    """Comprehensive analytics dashboard with date range support."""
    today = date.today()

    # Determine date ranges for current and previous period
    if period == "today":
        start_date = today
        prev_start = today - timedelta(days=1)
        prev_end = today - timedelta(days=1)
        group_by = "hour"
    elif period == "7d":
        start_date = today - timedelta(days=6)
        prev_start = today - timedelta(days=13)
        prev_end = today - timedelta(days=7)
        group_by = "day"
    elif period == "30d":
        start_date = today - timedelta(days=29)
        prev_start = today - timedelta(days=59)
        prev_end = today - timedelta(days=30)
        group_by = "day"
    elif period == "90d":
        start_date = today - timedelta(days=89)
        prev_start = today - timedelta(days=179)
        prev_end = today - timedelta(days=90)
        group_by = "day"
    else:  # 12m
        start_date = (today - timedelta(days=365)).replace(day=1)
        prev_start = (today - timedelta(days=730)).replace(day=1)
        prev_end = (today - timedelta(days=366)).replace(day=1)
        group_by = "month"

    # --- Key Metrics (current period) ---
    current_filter = [
        Order.status != "cancelled",
        func.date(Order.created_at) >= start_date,
    ]
    result = await db.execute(
        select(
            func.coalesce(func.sum(Order.subtotal), 0).label("gross_sales"),
            func.coalesce(func.sum(Order.discount_amount), 0).label("discounts"),
            func.coalesce(func.sum(Order.shipping_cost), 0).label("shipping"),
            func.coalesce(func.sum(Order.tax_amount), 0).label("tax"),
            func.coalesce(func.sum(Order.total), 0).label("total_sales"),
            func.count(Order.id).label("total_orders"),
        ).where(*current_filter)
    )
    row = result.one()
    gross_sales = float(row.gross_sales)
    discounts = float(row.discounts)
    shipping = float(row.shipping)
    tax = float(row.tax)
    total_sales = float(row.total_sales)
    total_orders = int(row.total_orders)
    avg_order_value = round(total_sales / total_orders, 2) if total_orders > 0 else 0

    # Returns in current period
    returns_result = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status == "returned")
        .where(func.date(Order.created_at) >= start_date)
    )
    returns = float(returns_result.scalar())
    net_sales = gross_sales - discounts - returns

    # Fulfilled orders in current period
    fulfilled_result = await db.execute(
        select(func.count())
        .select_from(Order)
        .where(Order.status.in_(["shipped", "delivered"]))
        .where(func.date(Order.created_at) >= start_date)
    )
    fulfilled_orders = int(fulfilled_result.scalar())

    # --- Previous period metrics for comparison ---
    prev_filter = [
        Order.status != "cancelled",
        func.date(Order.created_at) >= prev_start,
        func.date(Order.created_at) <= prev_end,
    ]
    prev_result = await db.execute(
        select(
            func.coalesce(func.sum(Order.total), 0).label("total_sales"),
            func.count(Order.id).label("total_orders"),
        ).where(*prev_filter)
    )
    prev_row = prev_result.one()
    prev_total_sales = float(prev_row.total_sales)
    prev_total_orders = int(prev_row.total_orders)
    prev_avg = round(prev_total_sales / prev_total_orders, 2) if prev_total_orders > 0 else 0

    prev_fulfilled = await db.execute(
        select(func.count())
        .select_from(Order)
        .where(Order.status.in_(["shipped", "delivered"]))
        .where(func.date(Order.created_at) >= prev_start)
        .where(func.date(Order.created_at) <= prev_end)
    )
    prev_fulfilled_orders = int(prev_fulfilled.scalar())

    def pct_change(current: float, previous: float) -> float:
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    # --- Sales Over Time ---
    sales_over_time = []
    if group_by == "day":
        result = await db.execute(
            select(
                func.date(Order.created_at).label("d"),
                func.coalesce(func.sum(Order.total), 0).label("sales"),
                func.count(Order.id).label("orders"),
            )
            .where(*current_filter)
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
        )
        date_data = {
            str(r.d): {"sales": float(r.sales), "orders": int(r.orders)}
            for r in result.all()
        }
        current_d = start_date
        while current_d <= today:
            ds = str(current_d)
            entry = date_data.get(ds, {"sales": 0, "orders": 0})
            sales_over_time.append({"date": ds, **entry})
            current_d += timedelta(days=1)
    elif group_by == "month":
        result = await db.execute(
            select(
                func.extract("year", Order.created_at).label("y"),
                func.extract("month", Order.created_at).label("m"),
                func.coalesce(func.sum(Order.total), 0).label("sales"),
                func.count(Order.id).label("orders"),
            )
            .where(*current_filter)
            .group_by(
                func.extract("year", Order.created_at),
                func.extract("month", Order.created_at),
            )
            .order_by(
                func.extract("year", Order.created_at),
                func.extract("month", Order.created_at),
            )
        )
        month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        for r in result.all():
            sales_over_time.append({
                "date": f"{month_names[int(r.m)]} {int(r.y)}",
                "sales": float(r.sales),
                "orders": int(r.orders),
            })
    else:  # hour (today)
        result = await db.execute(
            select(
                func.extract("hour", Order.created_at).label("h"),
                func.coalesce(func.sum(Order.total), 0).label("sales"),
                func.count(Order.id).label("orders"),
            )
            .where(*current_filter)
            .group_by(func.extract("hour", Order.created_at))
            .order_by(func.extract("hour", Order.created_at))
        )
        hour_data = {
            int(r.h): {"sales": float(r.sales), "orders": int(r.orders)}
            for r in result.all()
        }
        for h in range(24):
            entry = hour_data.get(h, {"sales": 0, "orders": 0})
            sales_over_time.append({"date": f"{h:02d}:00", **entry})

    # --- Top Products in Period ---
    top_products_result = await db.execute(
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.total_price).label("revenue"),
            func.max(OrderItem.image_url).label("image_url"),
        )
        .join(Order)
        .where(Order.status != "cancelled")
        .where(func.date(Order.created_at) >= start_date)
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )
    top_products = [
        {
            "name": r.product_name,
            "units_sold": int(r.units_sold),
            "revenue": float(r.revenue),
            "image_url": r.image_url,
        }
        for r in top_products_result.all()
    ]

    return {
        "metrics": {
            "total_sales": total_sales,
            "total_sales_change": pct_change(total_sales, prev_total_sales),
            "total_orders": total_orders,
            "total_orders_change": pct_change(total_orders, prev_total_orders),
            "avg_order_value": avg_order_value,
            "avg_order_value_change": pct_change(avg_order_value, prev_avg),
            "fulfilled_orders": fulfilled_orders,
            "fulfilled_orders_change": pct_change(fulfilled_orders, prev_fulfilled_orders),
        },
        "sales_breakdown": {
            "gross_sales": gross_sales,
            "discounts": discounts,
            "returns": returns,
            "net_sales": net_sales,
            "shipping": shipping,
            "tax": tax,
            "total_sales": total_sales,
        },
        "sales_over_time": sales_over_time,
        "top_products": top_products,
    }


@router.get("/sales")
async def get_sales_analytics(
    admin: User = require_module("analytics"),
    db: AsyncSession = Depends(get_db),
):
    """
    Sales analytics: total revenue, orders grouped by month (last 12 months),
    today's revenue, and this month's revenue.
    """
    today = date.today()
    first_of_month = today.replace(day=1)
    twelve_months_ago = (today - timedelta(days=365)).replace(day=1)

    # Total revenue (all time, excluding cancelled)
    result = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status != "cancelled")
    )
    total_revenue = float(result.scalar())

    # Today's revenue
    result = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status != "cancelled")
        .where(func.date(Order.created_at) == today)
    )
    today_revenue = float(result.scalar())

    # This month's revenue
    result = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status != "cancelled")
        .where(Order.created_at >= first_of_month)
    )
    month_revenue = float(result.scalar())

    # Orders by month (last 12 months)
    result = await db.execute(
        select(
            func.extract("year", Order.created_at).label("year"),
            func.extract("month", Order.created_at).label("month"),
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
        )
        .where(Order.created_at >= twelve_months_ago)
        .where(Order.status != "cancelled")
        .group_by(
            func.extract("year", Order.created_at),
            func.extract("month", Order.created_at),
        )
        .order_by(
            func.extract("year", Order.created_at),
            func.extract("month", Order.created_at),
        )
    )
    rows = result.all()
    orders_by_month = [
        {
            "year": int(row.year),
            "month": int(row.month),
            "order_count": row.order_count,
            "revenue": float(row.revenue),
        }
        for row in rows
    ]

    return {
        "total_revenue": total_revenue,
        "today_revenue": today_revenue,
        "month_revenue": month_revenue,
        "orders_by_month": orders_by_month,
    }


@router.get("/top-products")
async def get_top_products(
    admin: User = require_module("analytics"),
    db: AsyncSession = Depends(get_db),
):
    """Top 10 products by total_sold."""
    result = await db.execute(
        select(Product)
        .where(Product.total_sold > 0)
        .order_by(Product.total_sold.desc())
        .limit(10)
    )
    products = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "base_price": float(p.base_price),
            "total_sold": p.total_sold,
        }
        for p in products
    ]


@router.get("/customers")
async def get_customer_analytics(
    admin: User = require_module("analytics"),
    db: AsyncSession = Depends(get_db),
):
    """Customer analytics: total customers, new this month, new today."""
    today = date.today()
    first_of_month = today.replace(day=1)

    # Total customers
    result = await db.execute(
        select(func.count(User.id)).where(User.role == "customer")
    )
    total_customers = result.scalar()

    # New customers this month
    result = await db.execute(
        select(func.count(User.id))
        .where(User.role == "customer")
        .where(User.created_at >= first_of_month)
    )
    new_this_month = result.scalar()

    # New customers today
    result = await db.execute(
        select(func.count(User.id))
        .where(User.role == "customer")
        .where(func.date(User.created_at) == today)
    )
    new_today = result.scalar()

    return {
        "total_customers": total_customers,
        "new_this_month": new_this_month,
        "new_today": new_today,
    }
