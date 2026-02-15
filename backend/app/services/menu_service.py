from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.menu import Menu, MenuItem
from app.schemas.menu import MenuCreate, MenuUpdate, MenuItemCreate, MenuItemUpdate
from app.core.exceptions import NotFoundException, ConflictException


def item_to_dict(item) -> dict:
    """Convert a MenuItem ORM object to a plain dict."""
    return {
        "id": item.id,
        "menu_id": item.menu_id,
        "parent_id": item.parent_id,
        "title": item.title,
        "url": item.url,
        "link_type": item.link_type,
        "open_in_new_tab": item.open_in_new_tab,
        "display_order": item.display_order,
        "is_active": item.is_active,
        "children": [],
    }


def _build_item_tree(items, active_only: bool = False) -> list[dict]:
    """Build nested tree from flat list of MenuItems."""
    item_map = {}
    for item in items:
        if active_only and not item.is_active:
            continue
        item_map[item.id] = item_to_dict(item)

    roots = []
    for item in items:
        if item.id not in item_map:
            continue
        d = item_map[item.id]
        if item.parent_id and item.parent_id in item_map:
            item_map[item.parent_id]["children"].append(d)
        else:
            roots.append(d)

    return roots


# ── Menu CRUD ──

async def get_menus(db: AsyncSession) -> list[dict]:
    """List all menus with item counts."""
    result = await db.execute(select(Menu).order_by(Menu.created_at.asc()))
    menus = result.scalars().all()

    count_result = await db.execute(
        select(MenuItem.menu_id, func.count(MenuItem.id))
        .group_by(MenuItem.menu_id)
    )
    counts = dict(count_result.all())

    return [
        {
            "id": m.id,
            "name": m.name,
            "handle": m.handle,
            "is_active": m.is_active,
            "item_count": counts.get(m.id, 0),
            "created_at": m.created_at,
            "updated_at": m.updated_at,
        }
        for m in menus
    ]


async def get_menu_by_id(db: AsyncSession, menu_id: int) -> dict:
    """Get menu with nested items tree (admin view — includes inactive items)."""
    result = await db.execute(select(Menu).where(Menu.id == menu_id))
    menu = result.scalar_one_or_none()
    if not menu:
        raise NotFoundException("Menu not found")

    items_result = await db.execute(
        select(MenuItem)
        .where(MenuItem.menu_id == menu_id)
        .order_by(MenuItem.display_order.asc(), MenuItem.id.asc())
    )
    items = items_result.scalars().all()

    return {
        "id": menu.id,
        "name": menu.name,
        "handle": menu.handle,
        "is_active": menu.is_active,
        "items": _build_item_tree(items),
        "created_at": menu.created_at,
        "updated_at": menu.updated_at,
    }


async def get_menu_by_handle(db: AsyncSession, handle: str) -> dict | None:
    """Get active menu with active items tree (public storefront view)."""
    result = await db.execute(
        select(Menu).where(Menu.handle == handle, Menu.is_active == True)
    )
    menu = result.scalar_one_or_none()
    if not menu:
        return None

    items_result = await db.execute(
        select(MenuItem)
        .where(MenuItem.menu_id == menu.id)
        .order_by(MenuItem.display_order.asc(), MenuItem.id.asc())
    )
    items = items_result.scalars().all()

    return {
        "id": menu.id,
        "name": menu.name,
        "handle": menu.handle,
        "items": _build_item_tree(items, active_only=True),
    }


async def create_menu(db: AsyncSession, data: MenuCreate) -> Menu:
    # Check handle uniqueness
    existing = await db.execute(select(Menu).where(Menu.handle == data.handle))
    if existing.scalar_one_or_none():
        raise ConflictException(f"Menu with handle '{data.handle}' already exists")

    menu = Menu(**data.model_dump())
    db.add(menu)
    await db.flush()
    await db.refresh(menu)
    return menu


async def update_menu(db: AsyncSession, menu_id: int, data: MenuUpdate) -> Menu:
    result = await db.execute(select(Menu).where(Menu.id == menu_id))
    menu = result.scalar_one_or_none()
    if not menu:
        raise NotFoundException("Menu not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(menu, key, value)

    await db.flush()
    await db.refresh(menu)
    return menu


async def delete_menu(db: AsyncSession, menu_id: int) -> None:
    result = await db.execute(select(Menu).where(Menu.id == menu_id))
    menu = result.scalar_one_or_none()
    if not menu:
        raise NotFoundException("Menu not found")
    await db.delete(menu)
    await db.flush()


# ── Menu Item CRUD ──

async def create_item(db: AsyncSession, menu_id: int, data: MenuItemCreate) -> MenuItem:
    # Verify menu exists
    result = await db.execute(select(Menu).where(Menu.id == menu_id))
    if not result.scalar_one_or_none():
        raise NotFoundException("Menu not found")

    item = MenuItem(menu_id=menu_id, **data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def update_item(db: AsyncSession, item_id: int, data: MenuItemUpdate) -> MenuItem:
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException("Menu item not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    await db.flush()
    await db.refresh(item)
    return item


async def delete_item(db: AsyncSession, item_id: int) -> None:
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException("Menu item not found")
    await db.delete(item)
    await db.flush()


async def reorder_items(db: AsyncSession, menu_id: int, items: list[dict]) -> None:
    """Bulk update display_order for menu items."""
    for entry in items:
        result = await db.execute(
            select(MenuItem).where(MenuItem.id == entry["id"], MenuItem.menu_id == menu_id)
        )
        item = result.scalar_one_or_none()
        if item:
            item.display_order = entry["display_order"]
    await db.flush()


# ── Seeding ──

DEFAULT_MENUS = [
    {
        "name": "Header",
        "handle": "header",
        "items": [
            {"title": "New Arrivals", "url": "/category/new-arrivals", "display_order": 0},
            {"title": "Men", "url": "/category/men", "display_order": 1},
            {"title": "Women", "url": "/category/women", "display_order": 2},
            {"title": "Kids", "url": "/category/kids", "display_order": 3},
            {"title": "Accessories", "url": "/category/accessories", "display_order": 4},
            {"title": "Sale", "url": "/collections/sale", "display_order": 5},
        ],
    },
    {
        "name": "Products",
        "handle": "footer-products",
        "items": [
            {"title": "Men", "url": "/category/men", "display_order": 0},
            {"title": "Women", "url": "/category/women", "display_order": 1},
            {"title": "Kids", "url": "/category/kids", "display_order": 2},
            {"title": "New Arrivals", "url": "/category/new-arrivals", "display_order": 3},
            {"title": "Sale", "url": "/collections/sale", "display_order": 4},
        ],
    },
    {
        "name": "Support",
        "handle": "footer-support",
        "items": [
            {"title": "Help Center", "url": "/page/help", "display_order": 0},
            {"title": "Track Order", "url": "/track-order", "display_order": 1},
            {"title": "Shipping Info", "url": "/page/shipping", "display_order": 2},
            {"title": "Returns & Exchange", "url": "/page/returns", "display_order": 3},
            {"title": "Size Guide", "url": "/page/size-guide", "display_order": 4},
        ],
    },
    {
        "name": "Company",
        "handle": "footer-company",
        "items": [
            {"title": "About Us", "url": "/page/about", "display_order": 0},
            {"title": "Contact Us", "url": "/contact", "display_order": 1},
            {"title": "Careers", "url": "/page/careers", "display_order": 2},
            {"title": "Privacy Policy", "url": "/page/privacy", "display_order": 3},
            {"title": "Terms of Service", "url": "/page/terms", "display_order": 4},
        ],
    },
]


async def seed_default_menus(db: AsyncSession) -> None:
    """Create default menus if none exist."""
    result = await db.execute(select(func.count(Menu.id)))
    count = result.scalar()
    if count and count > 0:
        return  # Already have menus

    for menu_data in DEFAULT_MENUS:
        menu = Menu(name=menu_data["name"], handle=menu_data["handle"], is_active=True)
        db.add(menu)
        await db.flush()

        for item_data in menu_data["items"]:
            item = MenuItem(menu_id=menu.id, **item_data)
            db.add(item)

    await db.flush()
