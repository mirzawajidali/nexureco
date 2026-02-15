from io import StringIO
import csv
from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.core.dependencies import require_module
from app.models.user import User
from app.models.newsletter import NewsletterSubscriber
from app.utils.pagination import paginate

router = APIRouter(prefix="/admin/newsletter", tags=["Admin Newsletter"])


@router.get("/")
async def list_subscribers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: bool | None = None,
    admin: User = require_module("newsletter"),
    db: AsyncSession = Depends(get_db),
):
    """List newsletter subscribers with pagination and optional is_active filter."""
    query = select(NewsletterSubscriber).order_by(
        NewsletterSubscriber.subscribed_at.desc()
    )

    if is_active is not None:
        query = query.where(NewsletterSubscriber.is_active == is_active)

    result = await paginate(db, query, page=page, page_size=page_size)

    result["items"] = [
        {
            "id": sub.id,
            "email": sub.email,
            "is_active": sub.is_active,
            "subscribed_at": sub.subscribed_at.isoformat() if sub.subscribed_at else None,
            "unsubscribed_at": sub.unsubscribed_at.isoformat() if sub.unsubscribed_at else None,
        }
        for sub in result["items"]
    ]

    return result


@router.get("/export", response_class=PlainTextResponse)
async def export_subscribers_csv(
    admin: User = require_module("newsletter"),
    db: AsyncSession = Depends(get_db),
):
    """Export all active newsletter subscriber emails as CSV text."""
    result = await db.execute(
        select(NewsletterSubscriber)
        .where(NewsletterSubscriber.is_active == True)
        .order_by(NewsletterSubscriber.subscribed_at.desc())
    )
    subscribers = result.scalars().all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["email", "subscribed_at"])
    for sub in subscribers:
        writer.writerow([
            sub.email,
            sub.subscribed_at.isoformat() if sub.subscribed_at else "",
        ])

    return PlainTextResponse(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=newsletter_subscribers.csv"},
    )
