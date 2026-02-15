from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services import menu_service
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/menus", tags=["Menus"])


@router.get("/{handle}")
async def get_menu_by_handle(
    handle: str,
    db: AsyncSession = Depends(get_db),
):
    """Get an active menu with its items by handle (e.g. 'header', 'footer-products')."""
    menu = await menu_service.get_menu_by_handle(db, handle)
    if not menu:
        raise NotFoundException("Menu not found")
    return menu
