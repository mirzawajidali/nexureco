"""Blog posts: storefront listing/detail queries and the admin's create/update rules.

A post is live when it's published and its publish date has arrived, so the admin can schedule a post by
giving it a future publish date. Listings are newest first; the homepage slider shows featured posts first.
"""
import html
import math
import re
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.blog import BlogPost
from app.schemas.blog import BlogPostCreate, BlogPostUpdate
from app.utils.slug import generate_unique_slug

DEFAULT_AUTHOR = "Nexure CO"
WORDS_PER_MINUTE = 200
RELATED_LIMIT = 3

_TAG = re.compile(r"<[^>]+>")


def reading_minutes(content: str | None) -> int:
    words = len(html.unescape(_TAG.sub(" ", content or "")).split())
    return max(1, math.ceil(words / WORDS_PER_MINUTE))


def _utc(value: datetime | None) -> datetime | None:
    """Stored as UTC; a date without a time zone (the admin's date picker) is taken as UTC already."""
    if value is None or value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc)


def _is_live():
    return (
        BlogPost.is_published == True,  # noqa: E712
        or_(BlogPost.published_at.is_(None), BlogPost.published_at <= datetime.now(timezone.utc)),
    )


def _newest_first():
    return (BlogPost.published_at.desc(), BlogPost.id.desc())


# ── Storefront ───────────────────────────────────────────────────────────────


async def list_published(
    db: AsyncSession,
    page: int = 1,
    limit: int = 12,
    category: str | None = None,
    featured_first: bool = False,
) -> tuple[list[BlogPost], int]:
    conditions = list(_is_live())
    if category:
        conditions.append(BlogPost.category == category)
    total = (await db.execute(select(func.count(BlogPost.id)).where(*conditions))).scalar_one()
    order = ((BlogPost.is_featured.desc(),) if featured_first else ()) + _newest_first()
    result = await db.execute(
        select(BlogPost).where(*conditions).order_by(*order).offset((page - 1) * limit).limit(limit)
    )
    return list(result.scalars().all()), total


async def get_published(db: AsyncSession, slug: str) -> BlogPost | None:
    return (await db.execute(select(BlogPost).where(BlogPost.slug == slug, *_is_live()))).scalar_one_or_none()


async def related_posts(db: AsyncSession, post: BlogPost, limit: int = RELATED_LIMIT) -> list[BlogPost]:
    """Newest posts in the same category, topped up with the newest posts overall."""
    related: list[BlogPost] = []
    if post.category:
        related = list((await db.execute(
            select(BlogPost)
            .where(*_is_live(), BlogPost.id != post.id, BlogPost.category == post.category)
            .order_by(*_newest_first())
            .limit(limit)
        )).scalars().all())
    if len(related) < limit:
        exclude = [post.id] + [p.id for p in related]
        related += list((await db.execute(
            select(BlogPost)
            .where(*_is_live(), BlogPost.id.not_in(exclude))
            .order_by(*_newest_first())
            .limit(limit - len(related))
        )).scalars().all())
    return related


async def list_categories(db: AsyncSession) -> list[dict]:
    rows = await db.execute(
        select(BlogPost.category, func.count(BlogPost.id))
        .where(*_is_live(), BlogPost.category.is_not(None), BlogPost.category != "")
        .group_by(BlogPost.category)
        .order_by(BlogPost.category)
    )
    return [{"name": name, "count": count} for name, count in rows]


async def all_live(db: AsyncSession) -> list[BlogPost]:
    """Every live post, newest first (sitemap and the /blog no-JavaScript fallback)."""
    return list((await db.execute(select(BlogPost).where(*_is_live()).order_by(*_newest_first()))).scalars().all())


# ── Admin ────────────────────────────────────────────────────────────────────


async def list_for_admin(db: AsyncSession, search: str | None = None) -> list[BlogPost]:
    query = select(BlogPost)
    if search:
        query = query.where(BlogPost.title.ilike(f"%{search}%"))
    return list((await db.execute(query.order_by(BlogPost.created_at.desc(), BlogPost.id.desc()))).scalars().all())


async def create_post(db: AsyncSession, data: BlogPostCreate) -> BlogPost:
    values = data.model_dump()
    values["slug"] = await generate_unique_slug(db, BlogPost, BlogPost.slug, (data.slug or "").strip() or data.title)
    values["author_name"] = (data.author_name or "").strip() or DEFAULT_AUTHOR
    values["published_at"] = _utc(data.published_at) or (datetime.now(timezone.utc) if data.is_published else None)
    values["reading_minutes"] = reading_minutes(data.content)
    post = BlogPost(**values)
    db.add(post)
    await db.flush()
    await db.refresh(post)
    return post


async def update_post(db: AsyncSession, post: BlogPost, data: BlogPostUpdate) -> BlogPost:
    changes = data.model_dump(exclude_unset=True)

    # The slug only changes when the admin edits it, so renaming a post doesn't break links to it
    new_slug = (changes.pop("slug", None) or "").strip()
    if new_slug and new_slug != post.slug:
        post.slug = await generate_unique_slug(db, BlogPost, BlogPost.slug, new_slug)
    if "author_name" in changes:
        changes["author_name"] = (changes["author_name"] or "").strip() or DEFAULT_AUTHOR
    if "published_at" in changes:
        changes["published_at"] = _utc(changes["published_at"])

    for key, value in changes.items():
        setattr(post, key, value)
    if "content" in changes:
        post.reading_minutes = reading_minutes(post.content)
    # First publish without a date: it goes out now
    if post.is_published and post.published_at is None:
        post.published_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(post)
    return post
