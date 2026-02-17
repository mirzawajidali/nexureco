from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.redis import CacheService
from app.schemas.product import ProductListItem
from app.schemas.common import PaginatedResponse
from app.services import product_service
from app.services import es_search_service

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
    # 1. Check cache
    cache_key = CacheService.search_key(
        q=q, page=page, page_size=page_size, category=category,
        min_price=min_price, max_price=max_price, sort=sort,
    )
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    # 2. Try Elasticsearch (use relevance sort for text search)
    es_sort = "relevance" if sort == "newest" else sort
    result = await es_search_service.es_search_products(
        q=q, page=page, page_size=page_size,
        category_slug=category, min_price=min_price,
        max_price=max_price, sort=es_sort,
    )

    # 3. Fallback to MySQL
    if result is None:
        result = await product_service.list_products(
            db, q=q, page=page, page_size=page_size,
            category_slug=category, min_price=min_price,
            max_price=max_price, sort=sort,
        )

    # 4. Cache result
    await CacheService.set(cache_key, result, CacheService.TTL_SEARCH_RESULTS)
    return result


@router.get("/suggestions")
async def search_suggestions(
    q: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
):
    # 1. Check cache
    cache_key = CacheService.suggestions_key(q)
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    # 2. Try Elasticsearch
    result = await es_search_service.es_search_suggestions(q)

    # 3. Fallback to MySQL
    if result is None:
        result = await product_service.search_suggestions(db, q)

    # 4. Cache
    await CacheService.set(cache_key, result, CacheService.TTL_SUGGESTIONS)
    return result
