from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from app.core.dependencies import require_module
from app.models.user import User
from app.models.order import Order
from app.models.newsletter import NewsletterSubscriber

router = APIRouter(prefix="/admin/notifications", tags=["Admin Notifications"])


@router.get("/")
async def get_notifications(
    admin: User = require_module("dashboard"),
    db: AsyncSession = Depends(get_db),
):
    """Return recent orders and newsletter subscriptions for the notification bell."""
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)

    # Recent orders (last 10)
    orders_result = await db.execute(
        select(Order)
        .order_by(Order.created_at.desc())
        .limit(10)
    )
    recent_orders = orders_result.scalars().all()

    # Recent newsletter subs (last 10)
    subs_result = await db.execute(
        select(NewsletterSubscriber)
        .where(NewsletterSubscriber.is_active == True)
        .order_by(NewsletterSubscriber.subscribed_at.desc())
        .limit(10)
    )
    recent_subs = subs_result.scalars().all()

    # Counts for today
    orders_today = (await db.execute(
        select(func.count()).select_from(Order).where(Order.created_at >= last_24h)
    )).scalar() or 0

    subs_today = (await db.execute(
        select(func.count())
        .select_from(NewsletterSubscriber)
        .where(
            NewsletterSubscriber.is_active == True,
            NewsletterSubscriber.subscribed_at >= last_24h,
        )
    )).scalar() or 0

    return {
        "orders": [
            {
                "id": o.id,
                "order_number": o.order_number,
                "total": float(o.total),
                "status": o.status,
                "customer_name": f"{o.shipping_first_name or ''} {o.shipping_last_name or ''}".strip() or o.guest_email or "Guest",
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in recent_orders
        ],
        "newsletter": [
            {
                "id": s.id,
                "email": s.email,
                "subscribed_at": s.subscribed_at.isoformat() if s.subscribed_at else None,
            }
            for s in recent_subs
        ],
        "orders_today": orders_today,
        "newsletter_today": subs_today,
    }
