from slugify import slugify
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, Column


async def generate_unique_slug(
    db: AsyncSession,
    model_class,
    slug_column: Column,
    text: str,
) -> str:
    base_slug = slugify(text, max_length=200)
    slug = base_slug
    counter = 1

    while True:
        result = await db.execute(
            select(model_class).where(slug_column == slug)
        )
        if not result.scalar_one_or_none():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1
