from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import verify_password, hash_password
from app.core.exceptions import BadRequestException, NotFoundException
from app.schemas.user import (
    UpdateProfileRequest, ChangePasswordRequest,
    AddressCreate, AddressUpdate, AddressResponse,
)
from app.schemas.auth import UserResponse
from app.schemas.common import MessageResponse
from app.models.user import User, Address

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/profile", response_model=UserResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if request.first_name is not None:
        current_user.first_name = request.first_name
    if request.last_name is not None:
        current_user.last_name = request.last_name
    if request.phone is not None:
        current_user.phone = request.phone
    await db.flush()
    await db.refresh(current_user)
    return current_user


@router.put("/me/password", response_model=MessageResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(request.current_password, current_user.password_hash):
        raise BadRequestException("Current password is incorrect")
    current_user.password_hash = hash_password(request.new_password)
    await db.flush()
    return {"message": "Password changed successfully"}


@router.get("/me/addresses", response_model=list[AddressResponse])
async def list_addresses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Address).where(Address.user_id == current_user.id).order_by(Address.is_default.desc(), Address.created_at.desc())
    )
    return result.scalars().all()


@router.post("/me/addresses", response_model=AddressResponse, status_code=201)
async def create_address(
    request: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if request.is_default:
        await db.execute(
            update(Address).where(Address.user_id == current_user.id).values(is_default=False)
        )
    address = Address(user_id=current_user.id, **request.model_dump())
    db.add(address)
    await db.flush()
    await db.refresh(address)
    return address


@router.put("/me/addresses/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: int,
    request: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.user_id == current_user.id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise NotFoundException("Address not found")

    update_data = request.model_dump(exclude_unset=True)
    if update_data.get("is_default"):
        await db.execute(
            update(Address).where(Address.user_id == current_user.id).values(is_default=False)
        )
    for key, value in update_data.items():
        setattr(address, key, value)
    await db.flush()
    await db.refresh(address)
    return address


@router.delete("/me/addresses/{address_id}", response_model=MessageResponse)
async def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.user_id == current_user.id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise NotFoundException("Address not found")
    await db.delete(address)
    await db.flush()
    return {"message": "Address deleted successfully"}


@router.put("/me/addresses/{address_id}/default", response_model=AddressResponse)
async def set_default_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.user_id == current_user.id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise NotFoundException("Address not found")

    await db.execute(
        update(Address).where(Address.user_id == current_user.id).values(is_default=False)
    )
    address.is_default = True
    await db.flush()
    await db.refresh(address)
    return address
