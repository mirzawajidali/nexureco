from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import require_module
from app.schemas.collection import CollectionCreate, CollectionUpdate, CollectionOut, CollectionDetailOut
from app.schemas.common import MessageResponse
from app.services import collection_service
from app.models.user import User

router = APIRouter(prefix="/admin/collections", tags=["Admin Collections"])


class AddProductsRequest(BaseModel):
    product_ids: list[int]


@router.get("/", response_model=list[CollectionOut])
async def list_collections(
    admin: User = require_module("collections"),
    db: AsyncSession = Depends(get_db),
):
    return await collection_service.get_collections(db, active_only=False)


@router.get("/{collection_id}", response_model=CollectionDetailOut)
async def get_collection(
    collection_id: int,
    admin: User = require_module("collections"),
    db: AsyncSession = Depends(get_db),
):
    return await collection_service.get_collection_detail(db, collection_id)


@router.post("/", response_model=CollectionOut, status_code=201)
async def create_collection(
    data: CollectionCreate,
    admin: User = require_module("collections"),
    db: AsyncSession = Depends(get_db),
):
    return await collection_service.create_collection(db, data)


@router.put("/{collection_id}", response_model=CollectionOut)
async def update_collection(
    collection_id: int,
    data: CollectionUpdate,
    admin: User = require_module("collections"),
    db: AsyncSession = Depends(get_db),
):
    return await collection_service.update_collection(db, collection_id, data)


@router.delete("/{collection_id}", response_model=MessageResponse)
async def delete_collection(
    collection_id: int,
    admin: User = require_module("collections"),
    db: AsyncSession = Depends(get_db),
):
    await collection_service.delete_collection(db, collection_id)
    return {"message": "Collection deleted successfully"}


@router.post("/{collection_id}/products", response_model=MessageResponse)
async def add_products(
    collection_id: int,
    data: AddProductsRequest,
    admin: User = require_module("collections"),
    db: AsyncSession = Depends(get_db),
):
    await collection_service.add_products_to_collection(db, collection_id, data.product_ids)
    return {"message": "Products added to collection"}


@router.delete("/{collection_id}/products/{product_id}", response_model=MessageResponse)
async def remove_product(
    collection_id: int,
    product_id: int,
    admin: User = require_module("collections"),
    db: AsyncSession = Depends(get_db),
):
    await collection_service.remove_product_from_collection(db, collection_id, product_id)
    return {"message": "Product removed from collection"}
