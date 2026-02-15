from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import require_module
from app.schemas.contact import ContactOut, ContactReply
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services import contact_service
from app.models.user import User

router = APIRouter(prefix="/admin/contact-messages", tags=["Admin Contact Messages"])


@router.get("/", response_model=PaginatedResponse[ContactOut])
async def list_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    admin: User = require_module("contact_messages"),
    db: AsyncSession = Depends(get_db),
):
    return await contact_service.list_messages(db, page, page_size, status)


@router.get("/{message_id}", response_model=ContactOut)
async def get_message(
    message_id: int,
    admin: User = require_module("contact_messages"),
    db: AsyncSession = Depends(get_db),
):
    return await contact_service.get_message(db, message_id)


@router.put("/{message_id}/reply", response_model=MessageResponse)
async def reply_to_message(
    message_id: int,
    data: ContactReply,
    admin: User = require_module("contact_messages"),
    db: AsyncSession = Depends(get_db),
):
    return await contact_service.reply_to_message(db, message_id, data.reply)


@router.delete("/{message_id}", response_model=MessageResponse)
async def delete_message(
    message_id: int,
    admin: User = require_module("contact_messages"),
    db: AsyncSession = Depends(get_db),
):
    await contact_service.delete_message(db, message_id)
    return {"message": "Message deleted successfully"}
