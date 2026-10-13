import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.db.database import get_db
from app.schemas.blog import BlogCategory, BlogPostList, BlogPostOut, BlogPostSummary
from app.services import blog_service

router = APIRouter(prefix="/blog", tags=["Blog"])


@router.get("/posts", response_model=BlogPostList)
async def list_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=48),
    category: str | None = Query(None, max_length=80),
    featured_first: bool = False,
    db: AsyncSession = Depends(get_db),
):
    posts, total = await blog_service.list_published(db, page, limit, category, featured_first)
    return BlogPostList(
        items=[BlogPostSummary.model_validate(p) for p in posts],
        total=total,
        page=page,
        pages=max(1, math.ceil(total / limit)),
    )


@router.get("/categories", response_model=list[BlogCategory])
async def list_categories(db: AsyncSession = Depends(get_db)):
    return await blog_service.list_categories(db)


@router.get("/posts/{slug}", response_model=BlogPostOut)
async def get_post(slug: str, db: AsyncSession = Depends(get_db)):
    post = await blog_service.get_published(db, slug)
    if not post:
        raise NotFoundException("Post not found")
    out = BlogPostOut.model_validate(post)
    out.related = [BlogPostSummary.model_validate(p) for p in await blog_service.related_posts(db, post)]
    return out
