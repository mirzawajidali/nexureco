from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartOut, ApplyCouponRequest
from app.schemas.common import MessageResponse
from app.services import cart_service, coupon_service
from app.models.user import User

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("/", response_model=CartOut)
async def get_cart(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await cart_service.get_cart(db, user)


@router.post("/items", response_model=CartOut)
async def add_item(
    data: CartItemAdd,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await cart_service.add_to_cart(
        db, user, data.product_id, data.variant_id, data.quantity
    )


@router.put("/items/{item_id}", response_model=CartOut)
async def update_item(
    item_id: int,
    data: CartItemUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await cart_service.update_cart_item(db, user, item_id, data.quantity)


@router.delete("/items/{item_id}", response_model=CartOut)
async def remove_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await cart_service.remove_cart_item(db, user, item_id)


@router.delete("/", response_model=MessageResponse)
async def clear_cart(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await cart_service.clear_cart(db, user)
    return {"message": "Cart cleared"}


@router.post("/apply-coupon")
async def apply_coupon(
    data: ApplyCouponRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cart = await cart_service.get_cart(db, user)
    result = await coupon_service.validate_coupon(db, data.code, user.id, cart["subtotal"])
    return result
