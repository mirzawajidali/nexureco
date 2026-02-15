from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.core.dependencies import require_module
from app.models.user import User
from app.models.settings import StoreSetting

router = APIRouter(prefix="/admin/settings", tags=["Admin Settings"])


@router.get("/")
async def get_all_settings(
    admin: User = require_module("settings"),
    db: AsyncSession = Depends(get_db),
):
    """Get all store settings as a key-value dictionary."""
    result = await db.execute(select(StoreSetting))
    settings = result.scalars().all()
    return {s.setting_key: s.setting_value for s in settings}


@router.put("/")
async def update_settings(
    data: dict[str, str],
    admin: User = require_module("settings"),
    db: AsyncSession = Depends(get_db),
):
    """Update store settings. Body is a dict of key-value pairs."""
    for key, value in data.items():
        result = await db.execute(
            select(StoreSetting).where(StoreSetting.setting_key == key)
        )
        setting = result.scalar_one_or_none()

        if setting:
            setting.setting_value = value
        else:
            setting = StoreSetting(setting_key=key, setting_value=value)
            db.add(setting)

    await db.flush()

    # Return updated settings
    result = await db.execute(select(StoreSetting))
    settings = result.scalars().all()
    return {s.setting_key: s.setting_value for s in settings}
