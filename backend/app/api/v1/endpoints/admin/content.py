from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import require_module
from app.core.exceptions import NotFoundException, ConflictException
from app.models.user import User
from app.models.banner import Banner
from app.models.page import Page
from app.schemas.banner import BannerCreate, BannerUpdate, BannerOut
from app.schemas.page import PageCreate, PageUpdate, PageOut
from app.schemas.common import MessageResponse
from app.schemas.menu import (
    MenuCreate, MenuUpdate, MenuOut, MenuDetailOut,
    MenuItemCreate, MenuItemUpdate, MenuItemOut,
    ReorderRequest,
)
from app.services import menu_service
from app.utils.slug import generate_unique_slug

router = APIRouter(prefix="/admin/content", tags=["Admin Content"])


# ───────────────────────────── Banners ─────────────────────────────


@router.get("/banners/", response_model=list[BannerOut])
async def list_banners(
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Banner).order_by(Banner.display_order.asc(), Banner.created_at.desc())
    )
    return result.scalars().all()


@router.post("/banners/", response_model=BannerOut, status_code=201)
async def create_banner(
    data: BannerCreate,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    banner = Banner(
        title=data.title,
        subtitle=data.subtitle,
        image_url=data.image_url,
        mobile_image_url=data.mobile_image_url,
        link_url=data.link_url,
        button_text=data.button_text,
        position=data.position,
        display_order=data.display_order,
        is_active=data.is_active,
        starts_at=data.starts_at,
        expires_at=data.expires_at,
    )
    db.add(banner)
    await db.flush()
    await db.refresh(banner)
    return banner


@router.put("/banners/{banner_id}", response_model=BannerOut)
async def update_banner(
    banner_id: int,
    data: BannerUpdate,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise NotFoundException("Banner not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(banner, key, value)

    await db.flush()
    await db.refresh(banner)
    return banner


@router.delete("/banners/{banner_id}", response_model=MessageResponse)
async def delete_banner(
    banner_id: int,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise NotFoundException("Banner not found")

    await db.delete(banner)
    await db.flush()
    return {"message": "Banner deleted successfully"}


# ──────────────────────────── CMS Pages ────────────────────────────


@router.get("/pages/", response_model=list[PageOut])
async def list_pages(
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Page).order_by(Page.created_at.desc())
    )
    return result.scalars().all()


@router.post("/pages/", response_model=PageOut, status_code=201)
async def create_page(
    data: PageCreate,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    slug = await generate_unique_slug(db, Page, Page.slug, data.title)

    page = Page(
        title=data.title,
        slug=slug,
        content=data.content,
        is_published=data.is_published,
        meta_title=data.meta_title,
        meta_description=data.meta_description,
    )
    db.add(page)
    await db.flush()
    await db.refresh(page)
    return page


@router.put("/pages/{page_id}", response_model=PageOut)
async def update_page(
    page_id: int,
    data: PageUpdate,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise NotFoundException("Page not found")

    update_data = data.model_dump(exclude_unset=True)

    # If title changed but no explicit slug, regenerate slug
    if "title" in update_data and "slug" not in update_data:
        update_data["slug"] = await generate_unique_slug(
            db, Page, Page.slug, update_data["title"]
        )

    for key, value in update_data.items():
        setattr(page, key, value)

    await db.flush()
    await db.refresh(page)
    return page


@router.delete("/pages/{page_id}", response_model=MessageResponse)
async def delete_page(
    page_id: int,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise NotFoundException("Page not found")

    await db.delete(page)
    await db.flush()
    return {"message": "Page deleted successfully"}


# ──────────────────────────── Menus ────────────────────────────


@router.get("/menus/", response_model=list[MenuOut])
async def list_menus(
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    return await menu_service.get_menus(db)


@router.post("/menus/", response_model=MenuOut, status_code=201)
async def create_menu(
    data: MenuCreate,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    menu = await menu_service.create_menu(db, data)
    return {
        "id": menu.id,
        "name": menu.name,
        "handle": menu.handle,
        "is_active": menu.is_active,
        "item_count": 0,
        "created_at": menu.created_at,
        "updated_at": menu.updated_at,
    }


@router.get("/menus/{menu_id}", response_model=MenuDetailOut)
async def get_menu(
    menu_id: int,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    return await menu_service.get_menu_by_id(db, menu_id)


@router.put("/menus/{menu_id}", response_model=MenuOut)
async def update_menu(
    menu_id: int,
    data: MenuUpdate,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    menu = await menu_service.update_menu(db, menu_id, data)
    return {
        "id": menu.id,
        "name": menu.name,
        "handle": menu.handle,
        "is_active": menu.is_active,
        "item_count": 0,
        "created_at": menu.created_at,
        "updated_at": menu.updated_at,
    }


@router.delete("/menus/{menu_id}", response_model=MessageResponse)
async def delete_menu(
    menu_id: int,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    await menu_service.delete_menu(db, menu_id)
    return {"message": "Menu deleted successfully"}


# ── Menu Items ──


@router.post("/menus/{menu_id}/items", response_model=MenuItemOut, status_code=201)
async def create_menu_item(
    menu_id: int,
    data: MenuItemCreate,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    item = await menu_service.create_item(db, menu_id, data)
    return {**item.__dict__, "children": []}


@router.put("/menus/items/{item_id}", response_model=MenuItemOut)
async def update_menu_item(
    item_id: int,
    data: MenuItemUpdate,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    item = await menu_service.update_item(db, item_id, data)
    return {**item.__dict__, "children": []}


@router.delete("/menus/items/{item_id}", response_model=MessageResponse)
async def delete_menu_item(
    item_id: int,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    await menu_service.delete_item(db, item_id)
    return {"message": "Menu item deleted successfully"}


@router.put("/menus/{menu_id}/reorder", response_model=MessageResponse)
async def reorder_menu_items(
    menu_id: int,
    data: ReorderRequest,
    admin: User = require_module("content"),
    db: AsyncSession = Depends(get_db),
):
    await menu_service.reorder_items(db, menu_id, [i.model_dump() for i in data.items])
    return {"message": "Items reordered successfully"}
