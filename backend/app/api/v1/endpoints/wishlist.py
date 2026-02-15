from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.wishlist import WishlistAdd, WishlistItemOut
from app.schemas.common import MessageResponse
from app.services import wishlist_service
from app.models.user import User

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("/", response_model=list[WishlistItemOut])
async def get_wishlist(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await wishlist_service.get_wishlist(db, user.id)


@router.post("/", response_model=dict)
async def add_to_wishlist(
    data: WishlistAdd,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await wishlist_service.add_to_wishlist(db, user.id, data.product_id)


@router.delete("/{product_id}", response_model=MessageResponse)
async def remove_from_wishlist(
    product_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await wishlist_service.remove_from_wishlist(db, user.id, product_id)
