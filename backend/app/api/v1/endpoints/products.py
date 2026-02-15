from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.product import ProductListItem, ProductDetail
from app.schemas.common import PaginatedResponse
from app.services import product_service

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", response_model=PaginatedResponse[ProductListItem])
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str = "newest",
    q: str | None = None,
    ids: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    product_ids = [int(i) for i in ids.split(",") if i.strip()] if ids else None
    return await product_service.list_products(
        db,
        page=page,
        page_size=page_size,
        category_slug=category,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        q=q,
        product_ids=product_ids,
    )


@router.get("/featured", response_model=list[ProductListItem])
async def featured_products(
    limit: int = Query(8, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    result = await product_service.list_products(db, is_featured=True, page_size=limit)
    return result["items"]


@router.get("/new-arrivals", response_model=list[ProductListItem])
async def new_arrivals(
    limit: int = Query(8, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    result = await product_service.list_products(db, sort="newest", page_size=limit)
    return result["items"]


@router.get("/best-sellers", response_model=list[ProductListItem])
async def best_sellers(
    limit: int = Query(8, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    result = await product_service.list_products(db, sort="popular", page_size=limit)
    return result["items"]


@router.get("/{slug}", response_model=ProductDetail)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    return await product_service.get_product_by_slug(db, slug)
