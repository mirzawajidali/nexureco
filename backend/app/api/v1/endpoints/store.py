from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services import store_settings_service

router = APIRouter(prefix="/store", tags=["Store"])


@router.get("/settings")
async def public_store_settings(db: AsyncSession = Depends(get_db)):
    """Shipping rule and announcement for the storefront (set in Admin > Settings)."""
    s = await store_settings_service.get_store_settings(db)
    return {
        "free_shipping_threshold": s["checkout_free_shipping_from"],
        "standard_shipping_cost": s["checkout_shipping_charge"],
        "announcement_text": s["top_bar_announcement"],
    }
