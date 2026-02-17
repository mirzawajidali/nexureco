from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import require_module
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryOut
from app.schemas.common import MessageResponse
from app.services import category_service
from app.models.user import User
from app.db.redis import CacheService

router = APIRouter(prefix="/admin/categories", tags=["Admin Categories"])


@router.get("/", response_model=list[CategoryOut])
async def list_categories(
    admin: User = require_module("categories"),
    db: AsyncSession = Depends(get_db),
):
    return await category_service.get_categories_tree(db, active_only=False)


@router.post("/", response_model=CategoryOut, status_code=201)
async def create_category(
    data: CategoryCreate,
    admin: User = require_module("categories"),
    db: AsyncSession = Depends(get_db),
):
    result = await category_service.create_category(db, data)
    await CacheService.invalidate_categories()
    return result


@router.put("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    admin: User = require_module("categories"),
    db: AsyncSession = Depends(get_db),
):
    result = await category_service.update_category(db, category_id, data)
    await CacheService.invalidate_categories()
    return result


@router.delete("/{category_id}", response_model=MessageResponse)
async def delete_category(
    category_id: int,
    admin: User = require_module("categories"),
    db: AsyncSession = Depends(get_db),
):
    await category_service.delete_category(db, category_id)
    await CacheService.invalidate_categories()
    return {"message": "Category deleted successfully"}
