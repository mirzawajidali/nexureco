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


async def _after_category_change(db: AsyncSession) -> None:
    """Save, then refresh what shows category names: the category menus, product lists (each product
    carries its category name and slug) and the search index, which filters by category slug."""
    await db.commit()
    await CacheService.invalidate_categories()
    await CacheService.invalidate_product()
    from app.services.es_indexing_service import bulk_index_all_products
    await bulk_index_all_products(db)


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
    await _after_category_change(db)
    return result


@router.delete("/{category_id}", response_model=MessageResponse)
async def delete_category(
    category_id: int,
    admin: User = require_module("categories"),
    db: AsyncSession = Depends(get_db),
):
    await category_service.delete_category(db, category_id)
    await _after_category_change(db)
    return {"message": "Category deleted successfully"}
