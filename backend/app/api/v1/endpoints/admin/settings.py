from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import require_module
from app.core.exceptions import BadRequestException
from app.models.user import User
from app.services import store_settings_service

router = APIRouter(prefix="/admin/settings", tags=["Admin Settings"])


@router.get("/")
async def get_all_settings(
    admin: User = require_module("settings"),
    db: AsyncSession = Depends(get_db),
):
    """The editable store settings with their current values (saved, or the default)."""
    return await store_settings_service.get_store_settings(db)


@router.put("/")
async def update_settings(
    data: dict[str, str | int | float | None],
    admin: User = require_module("settings"),
    db: AsyncSession = Depends(get_db),
):
    """Save some or all editable settings; unknown keys and invalid values are refused."""
    try:
        return await store_settings_service.save_store_settings(db, data)
    except ValueError as exc:
        raise BadRequestException(str(exc)) from None
