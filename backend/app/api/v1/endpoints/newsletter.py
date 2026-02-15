from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.newsletter import NewsletterSubscribe, NewsletterUnsubscribe
from app.schemas.common import MessageResponse
from app.services import newsletter_service

router = APIRouter(prefix="/newsletter", tags=["Newsletter"])


@router.post("/subscribe", response_model=MessageResponse)
async def subscribe(
    data: NewsletterSubscribe,
    db: AsyncSession = Depends(get_db),
):
    return await newsletter_service.subscribe(db, data.email)


@router.post("/unsubscribe", response_model=MessageResponse)
async def unsubscribe(
    data: NewsletterUnsubscribe,
    db: AsyncSession = Depends(get_db),
):
    return await newsletter_service.unsubscribe(db, data.email)
