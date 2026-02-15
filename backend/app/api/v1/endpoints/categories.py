from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.category import CategoryOut
from app.schemas.product import ProductListItem
from app.schemas.common import PaginatedResponse
from app.services import category_service, product_service

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    return await category_service.get_categories_tree(db, active_only=True)


@router.get("/{slug}", response_model=CategoryOut)
async def get_category(slug: str, db: AsyncSession = Depends(get_db)):
    cat = await category_service.get_category_by_slug(db, slug)
    return category_service.cat_to_dict(cat)


@router.get("/{slug}/products", response_model=PaginatedResponse[ProductListItem])
async def get_category_products(
    slug: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str = "newest",
    db: AsyncSession = Depends(get_db),
):
    return await product_service.get_products_by_category(
        db, slug, page=page, page_size=page_size,
        min_price=min_price, max_price=max_price, sort=sort,
    )
