from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_module
from app.core.exceptions import NotFoundException
from app.db.database import get_db
from app.models.blog import BlogPost
from app.models.user import User
from app.schemas.blog import BlogPostAdminOut, BlogPostCreate, BlogPostUpdate
from app.schemas.common import MessageResponse
from app.services import blog_service

# Blog posts are site content: staff with the "content" module (Pages, Banners, Menus) manage them too
router = APIRouter(prefix="/admin/blog", tags=["Admin Blog"])


async def _get_post(db: AsyncSession, post_id: int) -> BlogPost:
    post = (await db.execute(select(BlogPost).where(BlogPost.id == post_id))).scalar_one_or_none()
    if not post:
        raise NotFoundException("Post not found")
    return post


@router.get("/posts", response_model=list[BlogPostAdminOut])
async def list_posts(
    search: str | None = Query(None, max_length=100),
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    return await blog_service.list_for_admin(db, search)


@router.get("/posts/{post_id}", response_model=BlogPostAdminOut)
async def get_post(
    post_id: int,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    return await _get_post(db, post_id)


@router.post("/posts", response_model=BlogPostAdminOut, status_code=201)
async def create_post(
    data: BlogPostCreate,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    return await blog_service.create_post(db, data)


@router.put("/posts/{post_id}", response_model=BlogPostAdminOut)
async def update_post(
    post_id: int,
    data: BlogPostUpdate,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    return await blog_service.update_post(db, await _get_post(db, post_id), data)


@router.delete("/posts/{post_id}", response_model=MessageResponse)
async def delete_post(
    post_id: int,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_post(db, post_id)
    await db.delete(post)
    await db.flush()
    return MessageResponse(message="Post deleted")
