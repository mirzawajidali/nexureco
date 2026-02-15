from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user, get_optional_user
from app.schemas.order import CheckoutRequest, OrderOut, OrderListItem, TrackOrderRequest, TrackOrderOut
from app.services import order_service
from app.models.user import User
from app.core.exceptions import BadRequestException

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("/track", response_model=TrackOrderOut)
async def track_order(
    data: TrackOrderRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — track an order by order number + email."""
    return await order_service.track_order(db, data)


@router.post("/checkout", response_model=OrderOut)
async def place_order(
    data: CheckoutRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    if not user and not data.guest_email:
        raise BadRequestException("Email is required for guest checkout")
    return await order_service.place_order(db, user, data)


@router.get("/", response_model=dict)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await order_service.get_user_orders(db, user.id, page, page_size)


@router.get("/{order_number}", response_model=OrderOut)
async def get_order(
    order_number: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await order_service.get_order_by_number(db, order_number, user.id)


@router.post("/{order_number}/cancel", response_model=OrderOut)
async def cancel_order(
    order_number: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await order_service.cancel_order(db, order_number, user.id)
