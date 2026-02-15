from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.models.wishlist import Wishlist
from app.models.product import Product, ProductImage
from app.core.exceptions import NotFoundException, ConflictException


async def get_wishlist(db: AsyncSession, user_id: int) -> list[dict]:
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.user_id == user_id)
        .order_by(Wishlist.created_at.desc())
    )
    items = result.scalars().all()

    wishlist_items = []
    for item in items:
        prod_result = await db.execute(
            select(Product)
            .options(selectinload(Product.images))
            .where(Product.id == item.product_id)
        )
        product = prod_result.scalar_one_or_none()
        if not product:
            continue

        primary_img = next((img.url for img in (product.images or []) if img.is_primary), None)
        if not primary_img and product.images:
            primary_img = product.images[0].url

        wishlist_items.append({
            "id": item.id,
            "product_id": product.id,
            "product_name": product.name,
            "product_slug": product.slug,
            "product_price": float(product.base_price),
            "compare_at_price": float(product.compare_at_price) if product.compare_at_price else None,
            "primary_image": primary_img,
            "created_at": item.created_at,
        })
    return wishlist_items


async def add_to_wishlist(db: AsyncSession, user_id: int, product_id: int) -> dict:
    # Check product exists
    prod_result = await db.execute(select(Product).where(Product.id == product_id))
    product = prod_result.scalar_one_or_none()
    if not product:
        raise NotFoundException("Product not found")

    # Check if already in wishlist
    existing = await db.execute(
        select(Wishlist).where(Wishlist.user_id == user_id, Wishlist.product_id == product_id)
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Product already in wishlist")

    item = Wishlist(user_id=user_id, product_id=product_id)
    db.add(item)
    await db.flush()
    return {"message": "Added to wishlist", "product_id": product_id}


async def remove_from_wishlist(db: AsyncSession, user_id: int, product_id: int) -> dict:
    result = await db.execute(
        select(Wishlist).where(Wishlist.user_id == user_id, Wishlist.product_id == product_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException("Item not in wishlist")
    await db.delete(item)
    await db.flush()
    return {"message": "Removed from wishlist"}
