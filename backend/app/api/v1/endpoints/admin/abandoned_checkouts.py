from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_module
from app.db.database import get_db
from app.models.user import User
from app.schemas.common import MessageResponse
from app.services import abandoned_checkout_service as drafts

router = APIRouter(prefix="/admin/abandoned-checkouts", tags=["Admin Orders"])


@router.get("/")
async def list_abandoned_checkouts(
    status: str = Query("open", pattern="^(open|reminded|converted|active|all)$"),
    admin: User = require_module("orders"),
    db: AsyncSession = Depends(get_db),
):
    """Unfinished checkouts with a ready-to-send WhatsApp reminder each."""
    return {"items": await drafts.list_for_admin(db, status)}


@router.post("/{draft_id}/reminded", response_model=MessageResponse)
async def mark_reminded(
    draft_id: int,
    admin: User = require_module("orders"),
    db: AsyncSession = Depends(get_db),
):
    await drafts.mark_reminded(db, draft_id)
    return {"message": "Marked as reminded"}
