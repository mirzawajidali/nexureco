from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.collection import Collection, CollectionProduct
from sqlalchemy.orm import selectinload
from app.models.product import Product, ProductImage
from app.schemas.collection import CollectionCreate, CollectionUpdate
from app.utils.slug import generate_unique_slug
from app.core.exceptions import NotFoundException


async def get_collections(db: AsyncSession, active_only: bool = True, featured_only: bool = False):
    query = select(Collection).order_by(Collection.display_order, Collection.name)
    if active_only:
        query = query.where(Collection.is_active == True)
    if featured_only:
        query = query.where(Collection.is_featured == True)
    result = await db.execute(query)
    collections = result.scalars().all()

    # Count products per collection
    count_result = await db.execute(
        select(CollectionProduct.collection_id, func.count(CollectionProduct.product_id))
        .group_by(CollectionProduct.collection_id)
    )
    counts = dict(count_result.all())

    return [
        {
            "id": col.id, "name": col.name, "slug": col.slug,
            "description": col.description, "image_url": col.image_url,
            "type": col.type, "is_featured": col.is_featured,
            "is_active": col.is_active, "display_order": col.display_order,
            "product_count": counts.get(col.id, 0),
            "created_at": col.created_at.isoformat() if col.created_at else None,
        }
        for col in collections
    ]


async def get_collection_by_slug(db: AsyncSession, slug: str) -> Collection:
    result = await db.execute(select(Collection).where(Collection.slug == slug))
    col = result.scalar_one_or_none()
    if not col:
        raise NotFoundException("Collection not found")
    return col


async def get_collection_by_id(db: AsyncSession, collection_id: int) -> Collection:
    result = await db.execute(select(Collection).where(Collection.id == collection_id))
    col = result.scalar_one_or_none()
    if not col:
        raise NotFoundException("Collection not found")
    return col


async def get_collection_detail(db: AsyncSession, collection_id: int) -> dict:
    collection = await get_collection_by_id(db, collection_id)

    # Get product count
    count_result = await db.execute(
        select(func.count(CollectionProduct.product_id))
        .where(CollectionProduct.collection_id == collection_id)
    )
    product_count = count_result.scalar() or 0

    # Get products with images eagerly loaded (single query instead of N+1)
    products_result = await db.execute(
        select(Product)
        .options(selectinload(Product.images))
        .join(CollectionProduct, CollectionProduct.product_id == Product.id)
        .where(CollectionProduct.collection_id == collection_id)
        .order_by(CollectionProduct.display_order, Product.name)
    )
    products = products_result.scalars().all()

    product_items = []
    for p in products:
        img_url = next(
            (img.url for img in (p.images or []) if img.is_primary),
            p.images[0].url if p.images else None,
        )
        product_items.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "image_url": img_url,
            "base_price": float(p.base_price),
            "status": p.status,
        })

    return {
        "id": collection.id,
        "name": collection.name,
        "slug": collection.slug,
        "description": collection.description,
        "image_url": collection.image_url,
        "type": collection.type,
        "is_featured": collection.is_featured,
        "is_active": collection.is_active,
        "display_order": collection.display_order,
        "meta_title": collection.meta_title,
        "meta_description": collection.meta_description,
        "product_count": product_count,
        "created_at": collection.created_at,
        "products": product_items,
    }


async def create_collection(db: AsyncSession, data: CollectionCreate) -> Collection:
    slug = await generate_unique_slug(db, Collection, Collection.slug, data.name)
    collection = Collection(slug=slug, **data.model_dump())
    db.add(collection)
    await db.flush()
    await db.refresh(collection)
    collection.product_count = 0
    return collection


async def update_collection(db: AsyncSession, collection_id: int, data: CollectionUpdate) -> Collection:
    collection = await get_collection_by_id(db, collection_id)
    update_data = data.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != collection.name:
        update_data["slug"] = await generate_unique_slug(db, Collection, Collection.slug, update_data["name"])
    for key, value in update_data.items():
        setattr(collection, key, value)
    await db.flush()
    await db.refresh(collection)

    # Get actual product count
    count_result = await db.execute(
        select(func.count(CollectionProduct.product_id))
        .where(CollectionProduct.collection_id == collection_id)
    )
    collection.product_count = count_result.scalar() or 0
    return collection


async def delete_collection(db: AsyncSession, collection_id: int) -> None:
    collection = await get_collection_by_id(db, collection_id)
    await db.delete(collection)
    await db.flush()


async def add_products_to_collection(db: AsyncSession, collection_id: int, product_ids: list[int]) -> None:
    await get_collection_by_id(db, collection_id)
    for pid in product_ids:
        existing = await db.execute(
            select(CollectionProduct).where(
                CollectionProduct.collection_id == collection_id,
                CollectionProduct.product_id == pid,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(CollectionProduct(collection_id=collection_id, product_id=pid))
    await db.flush()


async def remove_product_from_collection(db: AsyncSession, collection_id: int, product_id: int) -> None:
    result = await db.execute(
        select(CollectionProduct).where(
            CollectionProduct.collection_id == collection_id,
            CollectionProduct.product_id == product_id,
        )
    )
    cp = result.scalar_one_or_none()
    if cp:
        await db.delete(cp)
        await db.flush()
