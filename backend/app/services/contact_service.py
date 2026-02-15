from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import ContactMessage
from app.schemas.contact import ContactCreate
from app.core.exceptions import NotFoundException
from app.utils.email import send_email_background
from app.config import get_settings

_settings = get_settings()


def _to_dict(msg: ContactMessage) -> dict:
    return {
        "id": msg.id,
        "first_name": msg.first_name,
        "last_name": msg.last_name,
        "email": msg.email,
        "order_number": msg.order_number,
        "subject": msg.subject,
        "message": msg.message,
        "status": msg.status,
        "admin_reply": msg.admin_reply,
        "replied_at": msg.replied_at,
        "created_at": msg.created_at,
    }


async def create_message(db: AsyncSession, data: ContactCreate) -> dict:
    msg = ContactMessage(**data.model_dump())
    db.add(msg)
    await db.flush()

    # Send admin alert email
    sender_name = f"{data.first_name} {data.last_name}".strip()
    send_email_background(
        to=_settings.EMAIL_FROM,
        subject=f"New Contact Message — {data.subject}",
        template_name="contact_alert_admin.html",
        context={
            "sender_name": sender_name,
            "sender_email": data.email,
            "subject": data.subject,
            "message": data.message,
            "order_number": data.order_number,
        },
    )

    return {"message": "Your message has been sent. We'll get back to you within 24 hours."}


async def list_messages(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
) -> dict:
    query = select(ContactMessage)
    count_query = select(func.count(ContactMessage.id))

    if status:
        query = query.where(ContactMessage.status == status)
        count_query = count_query.where(ContactMessage.status == status)

    total = (await db.execute(count_query)).scalar() or 0
    total_pages = max(1, (total + page_size - 1) // page_size)

    query = query.order_by(ContactMessage.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = [_to_dict(m) for m in result.scalars().all()]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


async def get_message(db: AsyncSession, message_id: int) -> dict:
    result = await db.execute(
        select(ContactMessage).where(ContactMessage.id == message_id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise NotFoundException("Contact message not found")

    # Auto-mark as read
    if msg.status == "new":
        msg.status = "read"
        await db.flush()

    return _to_dict(msg)


async def reply_to_message(db: AsyncSession, message_id: int, reply_text: str) -> dict:
    result = await db.execute(
        select(ContactMessage).where(ContactMessage.id == message_id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise NotFoundException("Contact message not found")

    msg.admin_reply = reply_text
    msg.status = "replied"
    msg.replied_at = datetime.now(timezone.utc)
    await db.flush()
    return {"message": "Reply saved successfully"}


async def delete_message(db: AsyncSession, message_id: int) -> None:
    result = await db.execute(
        select(ContactMessage).where(ContactMessage.id == message_id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise NotFoundException("Contact message not found")
    await db.delete(msg)
    await db.flush()
