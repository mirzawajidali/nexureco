from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_admin
from app.schemas.staff import StaffCreate, StaffUpdate, StaffOut
from app.schemas.common import MessageResponse
from app.services import staff_service
from app.models.user import User

router = APIRouter(prefix="/admin/staff", tags=["Admin - Staff"])


@router.get("/", response_model=dict)
async def list_staff(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await staff_service.get_staff_list(db, page, page_size)


@router.post("/", response_model=StaffOut, status_code=201)
async def create_staff(
    data: StaffCreate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await staff_service.create_staff(db, data)


@router.get("/{user_id}", response_model=StaffOut)
async def get_staff(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await staff_service.get_staff(db, user_id)


@router.put("/{user_id}", response_model=StaffOut)
async def update_staff(
    user_id: int,
    data: StaffUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await staff_service.update_staff(db, user_id, data)


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_staff(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    await staff_service.delete_staff(db, user_id)
    return {"message": "Staff member deleted successfully"}
