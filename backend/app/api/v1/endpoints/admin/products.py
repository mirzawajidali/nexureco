import csv
import io
from typing import Literal
from fastapi import APIRouter, Depends, Query, UploadFile, File
from pydantic import BaseModel, ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import require_module
from app.core.exceptions import BadRequestException
from app.schemas.product import ProductCreate, ProductUpdate, ProductDetail, ProductListItem, ImageOut
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services import product_service
from app.utils.file_upload import save_upload_file_with_meta, delete_upload_file
from app.utils.csv_export import csv_download
from app.models.user import User
from app.models.media import MediaFile
from app.models.product import Product
from app.models.category import Category
from app.db.redis import CacheService

router = APIRouter(prefix="/admin/products", tags=["Admin Products"])


async def _category_and_children(db: AsyncSession, category_id: int | None) -> list[int] | None:
    """The category and every category under it (None: no category filter)."""
    if category_id is None:
        return None
    children: dict[int | None, list[int]] = {}
    for cid, parent in (await db.execute(select(Category.id, Category.parent_id))).all():
        children.setdefault(parent, []).append(cid)
    found, todo = [], [category_id]
    while todo:
        current = todo.pop()
        if current in found:
            continue
        found.append(current)
        todo.extend(children.get(current, []))
    return found


async def _after_catalog_change(db: AsyncSession, slug: str | None = None) -> None:
    """Save, then clear the shop's cached products and the category/collection counts and menus.
    (Clearing before the commit would let a shop visit in between cache the old data again.)"""
    await db.commit()
    await CacheService.invalidate_product(slug=slug)
    await CacheService.invalidate_categories()
    await CacheService.invalidate_collections()


@router.get("/", response_model=PaginatedResponse[ProductListItem])
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    q: str | None = None,
    sort: str = "newest",
    category_id: int | None = Query(None, description="This category and its subcategories"),
    stock: Literal["in_stock", "out_of_stock"] | None = None,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    category_ids = await _category_and_children(db, category_id)
    return await product_service.list_products(
        db, page=page, page_size=page_size, status=status, q=q, sort=sort,
        category_ids=category_ids, stock=stock,
    )


@router.post("/", response_model=ProductDetail, status_code=201)
async def create_product(
    data: ProductCreate,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    result = await product_service.create_product(db, data)
    await _after_catalog_change(db, result.get("slug"))
    return result


@router.get("/export")
async def export_products(
    status: str | None = None,
    q: str | None = None,
    category_id: int | None = None,
    stock: Literal["in_stock", "out_of_stock"] | None = None,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    category_ids = await _category_and_children(db, category_id)
    # Every matching product: the list is paged (at most 100 per page), so walk all the pages
    rows = []
    page = 1
    while True:
        data = await product_service.list_products(
            db, page=page, page_size=100, status=status, q=q, sort="newest", category_ids=category_ids, stock=stock,
        )
        for item in data["items"]:
            rows.append([
                item["name"],
                item["status"],
                item.get("sku") or "",
                item["base_price"],
                item.get("compare_at_price") or "",
                item.get("total_stock", 0),
                item.get("category_name") or "",
                ", ".join(item.get("tags") or []),
            ])
        if page >= (data.get("total_pages") or 1):
            break
        page += 1
    return csv_download(
        "products.csv", ["Name", "Status", "SKU", "Price", "Compare Price", "Stock", "Category", "Tags"], rows,
    )


@router.post("/import")
async def import_products(
    file: UploadFile = File(...),
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    created = 0
    errors = []
    for i, row in enumerate(reader, start=2):
        try:
            name = (row.get("Name") or "").strip()
            price_str = (row.get("Price") or "").strip()
            if not name or not price_str:
                errors.append(f"Row {i}: Name and Price are required")
                continue
            compare_str = (row.get("Compare Price") or "").strip()
            try:
                price = float(price_str.replace(",", ""))
                compare_at = float(compare_str.replace(",", "")) if compare_str else None
            except ValueError:
                errors.append(f"Row {i}: Price and Compare Price must be numbers")
                continue
            sku = (row.get("SKU") or "").strip() or None
            # Importing the same file twice mustn't add every product again
            if sku and await db.scalar(select(Product.id).where(Product.sku == sku).limit(1)):
                errors.append(f"Row {i}: a product with SKU {sku} already exists (skipped)")
                continue
            tags_str = (row.get("Tags") or "").strip()
            tags = [t.strip() for t in tags_str.split(",") if t.strip()] if tags_str else None
            product_data = ProductCreate(
                name=name,
                status=(row.get("Status") or "draft").strip().lower(),
                sku=sku,
                base_price=price,
                compare_at_price=compare_at,
                tags=tags,
            )
            # Each row in its own savepoint: a bad row is skipped, the others are still saved
            async with db.begin_nested():
                await product_service.create_product(db, product_data)
            created += 1
        except ValidationError as e:
            errors.append(f"Row {i}: " + "; ".join(f"{'.'.join(map(str, err['loc']))}: {err['msg']}" for err in e.errors()))
        except IntegrityError:
            errors.append(f"Row {i}: conflicts with an existing product (skipped)")
        except Exception as e:
            errors.append(f"Row {i}: {str(e).splitlines()[0][:150]}")
    if created > 0:
        await _after_catalog_change(db)
    return {"created": created, "errors": errors}


class BulkDeleteRequest(BaseModel):
    ids: list[int]


@router.post("/bulk-delete")
async def bulk_delete_products(
    data: BulkDeleteRequest,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    deleted = 0
    for product_id in data.ids:
        try:
            await product_service.delete_product(db, product_id)
            deleted += 1
        except Exception:
            pass
    if deleted > 0:
        await CacheService.invalidate_product()
    return {"deleted": deleted}


@router.get("/{product_id}", response_model=ProductDetail)
async def get_product(
    product_id: int,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    product = await product_service.get_product_by_id(db, product_id)
    return product_service._build_detail(product)


@router.put("/{product_id}", response_model=ProductDetail)
async def update_product(
    product_id: int,
    data: ProductUpdate,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    result = await product_service.update_product(db, product_id, data)
    await _after_catalog_change(db, result.get("slug"))
    return result


@router.delete("/{product_id}", response_model=MessageResponse)
async def delete_product(
    product_id: int,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    await product_service.delete_product(db, product_id)
    await _after_catalog_change(db)
    return {"message": "Product deleted successfully"}


@router.post("/{product_id}/images", response_model=ImageOut, status_code=201)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    alt_text: str | None = None,
    is_primary: bool = False,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    # Name the file after the product for image search, e.g. essential-tee-3f9a1c2b7d4e.avif
    product_slug = await db.scalar(select(Product.slug).where(Product.id == product_id))
    try:
        meta = await save_upload_file_with_meta(file, subfolder="products", name_hint=product_slug)
    except ValueError as exc:  # wrong type, too big, not an image: say so instead of a server error
        raise BadRequestException(str(exc)) from None

    # Also track in media library
    media_file = MediaFile(
        url=meta["url"],
        original_filename=meta["original_filename"],
        file_size=meta["file_size"],
        content_type=meta["content_type"],
        width=meta["width"],
        height=meta["height"],
        alt_text=alt_text,
    )
    db.add(media_file)

    image = await product_service.add_product_image(db, product_id, meta["url"], alt_text, is_primary)
    await product_service.refresh_product(db, product_id)  # search shows the photo too
    return image


@router.put("/{product_id}/images/{image_id}/primary", response_model=ImageOut)
async def set_primary_image(
    product_id: int,
    image_id: int,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    image = await product_service.set_primary_image(db, product_id, image_id)
    await product_service.refresh_product(db, product_id)
    return image


@router.put("/{product_id}/images/reorder")
async def reorder_product_images(
    product_id: int,
    body: dict,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    image_ids = body.get("image_ids", [])
    await product_service.reorder_product_images(db, product_id, image_ids)
    await product_service.refresh_product(db, product_id)
    return {"message": "Image order updated"}


@router.delete("/{product_id}/images/{image_id}", response_model=MessageResponse)
async def delete_product_image(
    product_id: int,
    image_id: int,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    await product_service.delete_product_image(db, product_id, image_id)
    await product_service.refresh_product(db, product_id)
    return {"message": "Image deleted successfully"}
