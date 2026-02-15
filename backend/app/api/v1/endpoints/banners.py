from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.banner import Banner

router = APIRouter(prefix="/banners", tags=["Banners"])


@router.get("/active")
async def get_active_banners(
    position: str | None = Query(None, description="Filter by position: hero, promo, announcement"),
    db: AsyncSession = Depends(get_db),
):
    """Get active banners, optionally filtered by position, ordered by display_order."""
    query = select(Banner).where(Banner.is_active == True)

    if position:
        query = query.where(Banner.position == position)

    query = query.order_by(Banner.display_order.asc())

    result = await db.execute(query)
    banners = result.scalars().all()

    return [
        {
            "id": b.id,
            "title": b.title,
            "subtitle": b.subtitle,
            "image_url": b.image_url,
            "mobile_image_url": b.mobile_image_url,
            "link_url": b.link_url,
            "button_text": b.button_text,
            "position": b.position,
            "display_order": b.display_order,
            "starts_at": b.starts_at.isoformat() if b.starts_at else None,
            "expires_at": b.expires_at.isoformat() if b.expires_at else None,
        }
        for b in banners
    ]
