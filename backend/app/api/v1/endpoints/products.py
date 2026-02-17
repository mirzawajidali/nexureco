from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.redis import CacheService
from app.schemas.product import ProductListItem, ProductDetail
from app.schemas.common import PaginatedResponse
from app.services import product_service
from app.services import es_search_service

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

    # For text search queries (no specific IDs), try ES first
    if q and not product_ids:
        cache_key = CacheService.search_key(
            q=q, page=page, page_size=page_size, category=category,
            min_price=min_price, max_price=max_price, sort=sort,
        )
        cached = await CacheService.get(cache_key)
        if cached:
            return cached

        es_sort = "relevance" if sort == "newest" else sort
        result = await es_search_service.es_search_products(
            q=q, page=page, page_size=page_size,
            category_slug=category, min_price=min_price,
            max_price=max_price, sort=es_sort,
        )
        if result is not None:
            await CacheService.set(cache_key, result, CacheService.TTL_SEARCH_RESULTS)
            return result

    # For non-search listings, check cache
    cache_key = None
    if not q and not product_ids:
        cache_key = CacheService.product_list_key(
            page=page, page_size=page_size, category=category,
            min_price=min_price, max_price=max_price, sort=sort,
        )
        cached = await CacheService.get(cache_key)
        if cached:
            return cached

    # MySQL (always works)
    result = await product_service.list_products(
        db, page=page, page_size=page_size,
        category_slug=category, min_price=min_price,
        max_price=max_price, sort=sort, q=q, product_ids=product_ids,
    )

    # Cache non-search, non-id results
    if cache_key:
        await CacheService.set(cache_key, result, CacheService.TTL_PRODUCT_LIST)

    return result


@router.get("/featured", response_model=list[ProductListItem])
async def featured_products(
    limit: int = Query(8, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    cache_key = CacheService.product_list_key(endpoint="featured", limit=limit)
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    result = await product_service.list_products(db, is_featured=True, page_size=limit)
    items = result["items"]
    await CacheService.set(cache_key, items, CacheService.TTL_PRODUCT_LIST)
    return items


@router.get("/new-arrivals", response_model=list[ProductListItem])
async def new_arrivals(
    limit: int = Query(8, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    cache_key = CacheService.product_list_key(endpoint="new-arrivals", limit=limit)
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    result = await product_service.list_products(db, sort="newest", page_size=limit)
    items = result["items"]
    await CacheService.set(cache_key, items, CacheService.TTL_PRODUCT_LIST)
    return items


@router.get("/best-sellers", response_model=list[ProductListItem])
async def best_sellers(
    limit: int = Query(8, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    cache_key = CacheService.product_list_key(endpoint="best-sellers", limit=limit)
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    result = await product_service.list_products(db, sort="popular", page_size=limit)
    items = result["items"]
    await CacheService.set(cache_key, items, CacheService.TTL_PRODUCT_LIST)
    return items


@router.get("/{slug}", response_model=ProductDetail)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    cache_key = CacheService.product_detail_key(slug)
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    result = await product_service.get_product_by_slug(db, slug)
    await CacheService.set(cache_key, result, CacheService.TTL_PRODUCT_DETAIL)
    return result
