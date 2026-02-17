from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.redis import CacheService
from app.schemas.collection import CollectionOut
from app.schemas.product import ProductListItem
from app.schemas.common import PaginatedResponse
from app.services import collection_service, product_service

router = APIRouter(prefix="/collections", tags=["Collections"])


@router.get("/", response_model=list[CollectionOut])
async def list_collections(db: AsyncSession = Depends(get_db)):
    cache_key = CacheService.collections_key(featured_only=False)
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    result = await collection_service.get_collections(db)
    await CacheService.set(cache_key, result, CacheService.TTL_COLLECTIONS)
    return result


@router.get("/featured", response_model=list[CollectionOut])
async def featured_collections(db: AsyncSession = Depends(get_db)):
    cache_key = CacheService.collections_key(featured_only=True)
    cached = await CacheService.get(cache_key)
    if cached:
        return cached

    result = await collection_service.get_collections(db, featured_only=True)
    await CacheService.set(cache_key, result, CacheService.TTL_COLLECTIONS)
    return result


@router.get("/{slug}", response_model=CollectionOut)
async def get_collection(slug: str, db: AsyncSession = Depends(get_db)):
    col = await collection_service.get_collection_by_slug(db, slug)
    col.product_count = 0
    return col


@router.get("/{slug}/products", response_model=PaginatedResponse[ProductListItem])
async def get_collection_products(
    slug: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = "newest",
    db: AsyncSession = Depends(get_db),
):
    return await product_service.get_products_by_collection(db, slug, page=page, page_size=page_size, sort=sort)
