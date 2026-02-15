from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_admin
from app.schemas.role import RoleCreate, RoleUpdate, RoleOut
from app.schemas.common import MessageResponse
from app.services import role_service
from app.models.role import ADMIN_MODULES
from app.models.user import User

router = APIRouter(prefix="/admin/roles", tags=["Admin - Roles"])


@router.get("/modules")
async def list_modules(admin: User = Depends(get_current_admin)):
    """Return all available admin modules."""
    return {"modules": ADMIN_MODULES}


@router.get("/", response_model=list[RoleOut])
async def list_roles(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await role_service.get_roles(db)


@router.post("/", response_model=RoleOut, status_code=201)
async def create_role(
    data: RoleCreate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    role = await role_service.create_role(db, data)
    # Return with staff_count
    roles = await role_service.get_roles(db)
    return next(r for r in roles if r["id"] == role.id)


@router.get("/{role_id}", response_model=RoleOut)
async def get_role(
    role_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    roles = await role_service.get_roles(db)
    match = next((r for r in roles if r["id"] == role_id), None)
    if not match:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Role not found")
    return match


@router.put("/{role_id}", response_model=RoleOut)
async def update_role(
    role_id: int,
    data: RoleUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    await role_service.update_role(db, role_id, data)
    roles = await role_service.get_roles(db)
    return next(r for r in roles if r["id"] == role_id)


@router.delete("/{role_id}", response_model=MessageResponse)
async def delete_role(
    role_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    await role_service.delete_role(db, role_id)
    return {"message": "Role deleted successfully"}
