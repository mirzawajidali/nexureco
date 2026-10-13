from datetime import timedelta
from typing import Literal
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from app.core.dependencies import require_module
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.utils.store_time import add_months, in_store_time, store_today, utc_range

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])

# Sales headlines count orders that are still sales: not cancelled and not returned
_NOT_SOLD = ("cancelled", "returned")


def _placed_between(start, end):
    return [Order.created_at >= start, Order.created_at < end]


@router.get("/dashboard")
async def get_analytics_dashboard(
    period: Literal["today", "7d", "30d", "90d", "12m"] = "30d",
    admin: User = require_module("analytics"),
    db: AsyncSession = Depends(get_db),
):
    """Comprehensive analytics dashboard with date range support (days in Pakistan time)."""
    today = store_today()

    # Current period and the same length just before it (never overlapping)
    if period == "today":
        start_date, prev_start, prev_end = today, today - timedelta(days=1), today - timedelta(days=1)
        group_by = "hour"
    elif period in ("7d", "30d", "90d"):
        days = {"7d": 7, "30d": 30, "90d": 90}[period]
        start_date = today - timedelta(days=days - 1)
        prev_start, prev_end = start_date - timedelta(days=days), start_date - timedelta(days=1)
        group_by = "day"
    else:  # 12m: this month and the 11 before it
        start_date = add_months(today, -11)
        prev_start, prev_end = add_months(start_date, -12), start_date - timedelta(days=1)
        group_by = "month"

    cur_start, cur_end = utc_range(start_date, today)
    prv_start, prv_end = utc_range(prev_start, prev_end)

    # --- Sales breakdown: every order placed in the period except cancelled ones (returns shown separately)
    placed = [Order.status != "cancelled", *_placed_between(cur_start, cur_end)]
    row = (await db.execute(
        select(
            func.coalesce(func.sum(Order.subtotal), 0).label("gross_sales"),
            func.coalesce(func.sum(Order.discount_amount), 0).label("discounts"),
            func.coalesce(func.sum(Order.shipping_cost), 0).label("shipping"),
            func.coalesce(func.sum(Order.tax_amount), 0).label("tax"),
        ).where(*placed)
    )).one()
    gross_sales = float(row.gross_sales)
    discounts = float(row.discounts)
    shipping = float(row.shipping)
    tax = float(row.tax)

    returns = float((await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status == "returned", *_placed_between(cur_start, cur_end))
    )).scalar())
    net_sales = gross_sales - discounts - returns

    # --- Headlines: orders still counted as sales (not cancelled, not returned)
    current_filter = [Order.status.notin_(_NOT_SOLD), *_placed_between(cur_start, cur_end)]
    row = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0).label("total_sales"), func.count(Order.id).label("total_orders"))
        .where(*current_filter)
    )).one()
    total_sales = float(row.total_sales)
    total_orders = int(row.total_orders)
    avg_order_value = round(total_sales / total_orders, 2) if total_orders > 0 else 0

    fulfilled_orders = int((await db.execute(
        select(func.count()).select_from(Order)
        .where(Order.status.in_(["shipped", "delivered"]), *_placed_between(cur_start, cur_end))
    )).scalar())

    # --- Previous period, for the comparison arrows
    prev_row = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0).label("total_sales"), func.count(Order.id).label("total_orders"))
        .where(Order.status.notin_(_NOT_SOLD), *_placed_between(prv_start, prv_end))
    )).one()
    prev_total_sales = float(prev_row.total_sales)
    prev_total_orders = int(prev_row.total_orders)
    prev_avg = round(prev_total_sales / prev_total_orders, 2) if prev_total_orders > 0 else 0

    prev_fulfilled_orders = int((await db.execute(
        select(func.count()).select_from(Order)
        .where(Order.status.in_(["shipped", "delivered"]), *_placed_between(prv_start, prv_end))
    )).scalar())

    def pct_change(current: float, previous: float) -> float:
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    # --- Sales over time, by Pakistan day / month / hour
    local_time = in_store_time(Order.created_at)
    sales_over_time = []
    if group_by == "day":
        local_day = func.date(local_time)
        result = await db.execute(
            select(
                local_day.label("d"),
                func.coalesce(func.sum(Order.total), 0).label("sales"),
                func.count(Order.id).label("orders"),
            )
            .where(*current_filter)
            .group_by(local_day)
            .order_by(local_day)
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
        year, month = func.extract("year", local_time), func.extract("month", local_time)
        result = await db.execute(
            select(
                year.label("y"),
                month.label("m"),
                func.coalesce(func.sum(Order.total), 0).label("sales"),
                func.count(Order.id).label("orders"),
            )
            .where(*current_filter)
            .group_by(year, month)
            .order_by(year, month)
        )
        month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        month_data = {
            (int(r.y), int(r.m)): {"sales": float(r.sales), "orders": int(r.orders)}
            for r in result.all()
        }
        # All 12 months, including ones without orders (like the daily chart)
        for i in range(12):
            month_start = add_months(start_date, i)
            entry = month_data.get((month_start.year, month_start.month), {"sales": 0, "orders": 0})
            sales_over_time.append({"date": f"{month_names[month_start.month]} {month_start.year}", **entry})
    else:  # hour (today)
        hour = func.extract("hour", local_time)
        result = await db.execute(
            select(
                hour.label("h"),
                func.coalesce(func.sum(Order.total), 0).label("sales"),
                func.count(Order.id).label("orders"),
            )
            .where(*current_filter)
            .group_by(hour)
            .order_by(hour)
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
        .where(*current_filter)
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
    today's revenue, and this month's revenue (Pakistan time; cancelled and returned orders left out).
    """
    today = store_today()
    sold = Order.status.notin_(_NOT_SOLD)

    total_revenue = float((await db.execute(select(func.coalesce(func.sum(Order.total), 0)).where(sold))).scalar())

    day_start, day_end = utc_range(today, today)
    today_revenue = float((await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(sold, *_placed_between(day_start, day_end))
    )).scalar())

    month_start, _ = utc_range(today.replace(day=1), today)
    month_revenue = float((await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(sold, Order.created_at >= month_start)
    )).scalar())

    # Orders by month (this month and the 11 before it)
    since, _ = utc_range(add_months(today, -11), today)
    local_time = in_store_time(Order.created_at)
    year, month = func.extract("year", local_time), func.extract("month", local_time)
    result = await db.execute(
        select(
            year.label("year"),
            month.label("month"),
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
        )
        .where(Order.created_at >= since, sold)
        .group_by(year, month)
        .order_by(year, month)
    )
    orders_by_month = [
        {
            "year": int(row.year),
            "month": int(row.month),
            "order_count": row.order_count,
            "revenue": float(row.revenue),
        }
        for row in result.all()
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
    """Customer analytics: total customers, new this month, new today (Pakistan time)."""
    today = store_today()
    day_start, day_end = utc_range(today, today)
    month_start, _ = utc_range(today.replace(day=1), today)
    customer = User.role == "customer"

    total_customers = (await db.execute(select(func.count(User.id)).where(customer))).scalar()
    new_this_month = (await db.execute(
        select(func.count(User.id)).where(customer, User.created_at >= month_start)
    )).scalar()
    new_today = (await db.execute(
        select(func.count(User.id)).where(customer, User.created_at >= day_start, User.created_at < day_end)
    )).scalar()

    return {
        "total_customers": total_customers,
        "new_this_month": new_this_month,
        "new_today": new_today,
    }
