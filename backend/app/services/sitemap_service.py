from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product import Product
from app.models.category import Category
from app.models.collection import Collection
from app.models.page import Page


async def get_sitemap_entries(db: AsyncSession) -> dict:
    """Fetch all active/published content slugs and timestamps for sitemap."""

    # Active products
    products_result = await db.execute(
        select(Product.slug, Product.updated_at)
        .where(Product.status == "active")
        .order_by(Product.updated_at.desc())
    )
    products = [{"slug": r.slug, "updated_at": r.updated_at} for r in products_result]

    # Active categories
    categories_result = await db.execute(
        select(Category.slug, Category.updated_at)
        .where(Category.is_active == True)
        .order_by(Category.updated_at.desc())
    )
    categories = [{"slug": r.slug, "updated_at": r.updated_at} for r in categories_result]

    # Active collections
    collections_result = await db.execute(
        select(Collection.slug, Collection.updated_at)
        .where(Collection.is_active == True)
        .order_by(Collection.updated_at.desc())
    )
    collections = [{"slug": r.slug, "updated_at": r.updated_at} for r in collections_result]

    # Published pages
    pages_result = await db.execute(
        select(Page.slug, Page.updated_at)
        .where(Page.is_published == True)
        .order_by(Page.updated_at.desc())
    )
    pages = [{"slug": r.slug, "updated_at": r.updated_at} for r in pages_result]

    return {
        "products": products,
        "categories": categories,
        "collections": collections,
        "pages": pages,
    }
