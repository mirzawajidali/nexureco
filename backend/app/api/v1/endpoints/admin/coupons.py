from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import require_module
from app.core.exceptions import NotFoundException, ConflictException
from app.models.user import User
from app.models.coupon import Coupon
from app.schemas.coupon import CouponCreate, CouponUpdate, CouponOut
from app.schemas.common import PaginatedResponse, MessageResponse
from app.utils.pagination import paginate

router = APIRouter(prefix="/admin/coupons", tags=["Admin Coupons"])


@router.get("/", response_model=PaginatedResponse[CouponOut])
async def list_coupons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = require_module("coupons"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Coupon).order_by(Coupon.created_at.desc())
    return await paginate(db, query, page=page, page_size=page_size)


@router.get("/{coupon_id}", response_model=CouponOut)
async def get_coupon(
    coupon_id: int,
    admin: User = require_module("coupons"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise NotFoundException("Coupon not found")
    return coupon


@router.post("/", response_model=CouponOut, status_code=201)
async def create_coupon(
    data: CouponCreate,
    admin: User = require_module("coupons"),
    db: AsyncSession = Depends(get_db),
):
    # Check for duplicate code
    existing = await db.execute(
        select(Coupon).where(Coupon.code == data.code.upper())
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Coupon code already exists")

    coupon = Coupon(
        code=data.code.upper(),
        description=data.description,
        type=data.type,
        value=data.value,
        min_order_amount=data.min_order_amount,
        max_discount=data.max_discount,
        usage_limit=data.usage_limit,
        usage_per_customer=data.usage_per_customer,
        is_active=data.is_active,
        starts_at=data.starts_at,
        expires_at=data.expires_at,
    )
    db.add(coupon)
    await db.flush()
    await db.refresh(coupon)
    return coupon


@router.put("/{coupon_id}", response_model=CouponOut)
async def update_coupon(
    coupon_id: int,
    data: CouponUpdate,
    admin: User = require_module("coupons"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise NotFoundException("Coupon not found")

    update_data = data.model_dump(exclude_unset=True)

    # If code is being changed, check for duplicates
    if "code" in update_data:
        update_data["code"] = update_data["code"].upper()
        existing = await db.execute(
            select(Coupon).where(
                Coupon.code == update_data["code"],
                Coupon.id != coupon_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictException("Coupon code already exists")

    for key, value in update_data.items():
        setattr(coupon, key, value)

    await db.flush()
    await db.refresh(coupon)
    return coupon


@router.delete("/{coupon_id}", response_model=MessageResponse)
async def delete_coupon(
    coupon_id: int,
    admin: User = require_module("coupons"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise NotFoundException("Coupon not found")

    await db.delete(coupon)
    await db.flush()
    return {"message": "Coupon deleted successfully"}
