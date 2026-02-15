from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.newsletter import NewsletterSubscriber
from app.core.exceptions import ConflictException, NotFoundException
from app.utils.email import send_email_background
from app.config import get_settings

_settings = get_settings()


async def subscribe(db: AsyncSession, email: str) -> dict:
    result = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        if existing.is_active:
            raise ConflictException("Already subscribed")
        existing.is_active = True
        existing.unsubscribed_at = None
        await db.flush()
        return {"message": "Successfully re-subscribed"}

    subscriber = NewsletterSubscriber(email=email)
    db.add(subscriber)
    await db.flush()

    # Send welcome email
    send_email_background(
        to=email,
        subject=f"Welcome to the {_settings.APP_NAME} Newsletter",
        template_name="newsletter_welcome.html",
        context={},
    )

    return {"message": "Successfully subscribed"}


async def unsubscribe(db: AsyncSession, email: str) -> dict:
    result = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
    )
    subscriber = result.scalar_one_or_none()
    if not subscriber or not subscriber.is_active:
        raise NotFoundException("Subscription not found")

    subscriber.is_active = False
    subscriber.unsubscribed_at = datetime.now(timezone.utc)
    await db.flush()
    return {"message": "Successfully unsubscribed"}
