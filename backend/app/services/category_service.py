from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.utils.slug import generate_unique_slug
from app.core.exceptions import NotFoundException, ConflictException


def cat_to_dict(cat, product_count: int = 0) -> dict:
    """Convert a Category ORM object to a plain dict to avoid lazy-load issues."""
    return {
        "id": cat.id,
        "parent_id": cat.parent_id,
        "name": cat.name,
        "slug": cat.slug,
        "description": cat.description,
        "image_url": cat.image_url,
        "display_order": cat.display_order,
        "is_active": cat.is_active,
        "meta_title": cat.meta_title,
        "meta_description": cat.meta_description,
        "product_count": product_count,
        "created_at": cat.created_at,
        "children": [],
    }


async def get_categories_tree(db: AsyncSession, active_only: bool = True):
    query = select(Category).order_by(Category.display_order, Category.name)
    if active_only:
        query = query.where(Category.is_active == True)
    result = await db.execute(query)
    categories = result.scalars().all()

    # Count products per category
    count_result = await db.execute(
        select(Product.category_id, func.count(Product.id))
        .where(Product.status == "active")
        .group_by(Product.category_id)
    )
    counts = dict(count_result.all())

    # Build tree using plain dicts (avoids triggering ORM lazy loads on 'children' backref)
    cat_map = {}
    for cat in categories:
        cat_map[cat.id] = cat_to_dict(cat, counts.get(cat.id, 0))

    roots = []
    for cat in categories:
        d = cat_map[cat.id]
        if cat.parent_id and cat.parent_id in cat_map:
            cat_map[cat.parent_id]["children"].append(d)
        else:
            roots.append(d)

    return roots


async def get_category_by_slug(db: AsyncSession, slug: str) -> Category:
    result = await db.execute(select(Category).where(Category.slug == slug))
    cat = result.scalar_one_or_none()
    if not cat:
        raise NotFoundException("Category not found")
    return cat


async def get_category_by_id(db: AsyncSession, category_id: int) -> Category:
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise NotFoundException("Category not found")
    return cat


async def create_category(db: AsyncSession, data: CategoryCreate) -> dict:
    slug = await generate_unique_slug(db, Category, Category.slug, data.name)
    category = Category(slug=slug, **data.model_dump())
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return cat_to_dict(category)


async def update_category(db: AsyncSession, category_id: int, data: CategoryUpdate) -> dict:
    category = await get_category_by_id(db, category_id)
    update_data = data.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != category.name:
        update_data["slug"] = await generate_unique_slug(db, Category, Category.slug, update_data["name"])
    for key, value in update_data.items():
        setattr(category, key, value)
    await db.flush()
    await db.refresh(category)
    return cat_to_dict(category)


async def delete_category(db: AsyncSession, category_id: int) -> None:
    category = await get_category_by_id(db, category_id)
    await db.delete(category)
    await db.flush()
