from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.product import ProductListItem
from app.schemas.common import PaginatedResponse
from app.services import product_service

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/", response_model=PaginatedResponse[ProductListItem])
async def search_products(
    q: str = Query(min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str = "newest",
    db: AsyncSession = Depends(get_db),
):
    return await product_service.list_products(
        db,
        q=q,
        page=page,
        page_size=page_size,
        category_slug=category,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
    )


@router.get("/suggestions")
async def search_suggestions(
    q: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
):
    return await product_service.search_suggestions(db, q)
