"""Which category and collection pages currently have products to show.

Empty listings are left out of the storefront menus and the sitemap, so they reappear
automatically as soon as products are added.
"""
import re
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.collection import Collection, CollectionProduct
from app.models.product import Product

_LISTING_PATH = re.compile(r"^/(category|collections)/([^/]+)$")


async def get_listings_with_products(db: AsyncSession) -> tuple[set[str], set[str]]:
    """Return (category slugs, collection slugs) of active listings that have active products.

    A category counts as non-empty if it or any active subcategory has products. Automated
    collections are always treated as non-empty since their products come from rules.
    """
    categories = (await db.execute(
        select(Category.id, Category.slug, Category.parent_id).where(Category.is_active == True)
    )).all()
    stocked_ids = set((await db.execute(
        select(Product.category_id).where(Product.status == "active").distinct()
    )).scalars())

    parent_of = {c.id: c.parent_id for c in categories}
    non_empty_ids: set[int] = set()
    for category_id in stocked_ids:
        # Walk up the tree so parents of stocked subcategories count too
        seen = set()
        while category_id in parent_of and category_id not in seen:
            seen.add(category_id)
            non_empty_ids.add(category_id)
            category_id = parent_of[category_id]
    category_slugs = {c.slug for c in categories if c.id in non_empty_ids}

    collections = (await db.execute(
        select(Collection.id, Collection.slug, Collection.type).where(Collection.is_active == True)
    )).all()
    stocked_collection_ids = set((await db.execute(
        select(CollectionProduct.collection_id)
        .join(Product, Product.id == CollectionProduct.product_id)
        .where(Product.status == "active")
        .distinct()
    )).scalars())
    collection_slugs = {
        c.slug for c in collections if c.type == "automated" or c.id in stocked_collection_ids
    }

    return category_slugs, collection_slugs


def is_empty_listing_url(url: str, category_slugs: set[str], collection_slugs: set[str]) -> bool:
    """True if ``url`` points to a category/collection page that has nothing to show."""
    match = _LISTING_PATH.match(urlparse(url).path.rstrip("/"))
    if not match:
        return False
    kind, slug = match.groups()
    return slug not in (category_slugs if kind == "category" else collection_slugs)
