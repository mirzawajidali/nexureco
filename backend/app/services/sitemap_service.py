from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product import Product
from app.models.category import Category
from app.models.collection import Collection
from app.models.page import Page
from app.services.listing_service import get_listings_with_products

# CMS pages whose storefront URL redirects to a dedicated route (see frontend/src/routes/index.tsx)
REDIRECTED_PAGE_SLUGS = frozenset({"about", "contact"})


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
    # /page/about and /page/contact redirect to the dedicated /about and /contact pages
    pages = [
        {"slug": r.slug, "updated_at": r.updated_at}
        for r in pages_result
        if r.slug not in REDIRECTED_PAGE_SLUGS
    ]

    # Empty category/collection pages are noindex'd on the storefront, so leave them out
    category_slugs, collection_slugs = await get_listings_with_products(db)
    categories = [c for c in categories if c["slug"] in category_slugs]
    collections = [c for c in collections if c["slug"] in collection_slugs]

    return {
        "products": products,
        "categories": categories,
        "collections": collections,
        "pages": pages,
    }
