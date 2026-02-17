import csv
import io
from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import require_module
from app.schemas.product import ProductCreate, ProductUpdate, ProductDetail, ProductListItem, ImageOut
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services import product_service
from app.utils.file_upload import save_upload_file_with_meta, delete_upload_file
from app.models.user import User
from app.models.media import MediaFile

router = APIRouter(prefix="/admin/products", tags=["Admin Products"])


@router.get("/", response_model=PaginatedResponse[ProductListItem])
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    q: str | None = None,
    sort: str = "newest",
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    return await product_service.list_products(
        db, page=page, page_size=page_size, status=status, q=q, sort=sort,
    )


@router.post("/", response_model=ProductDetail, status_code=201)
async def create_product(
    data: ProductCreate,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    return await product_service.create_product(db, data)


@router.get("/export")
async def export_products(
    status: str | None = None,
    q: str | None = None,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    data = await product_service.list_products(
        db, page=1, page_size=10000, status=status, q=q, sort="newest",
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Status", "SKU", "Price", "Compare Price", "Stock", "Category", "Tags"])
    for item in data["items"]:
        writer.writerow([
            item["name"],
            item["status"],
            item.get("sku") or "",
            item["base_price"],
            item.get("compare_at_price") or "",
            item.get("total_stock", 0),
            item.get("category_name") or "",
            ", ".join(item.get("tags") or []),
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products.csv"},
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
            price = float(price_str)
            tags_str = (row.get("Tags") or "").strip()
            tags = [t.strip() for t in tags_str.split(",") if t.strip()] if tags_str else None
            product_data = ProductCreate(
                name=name,
                status=(row.get("Status") or "draft").strip().lower(),
                sku=(row.get("SKU") or "").strip() or None,
                base_price=price,
                compare_at_price=float(row["Compare Price"]) if row.get("Compare Price", "").strip() else None,
                tags=tags,
            )
            await product_service.create_product(db, product_data)
            created += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")
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
    return await product_service.update_product(db, product_id, data)


@router.delete("/{product_id}", response_model=MessageResponse)
async def delete_product(
    product_id: int,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    await product_service.delete_product(db, product_id)
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
    meta = await save_upload_file_with_meta(file, subfolder="products")

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
    return image


@router.put("/{product_id}/images/{image_id}/primary", response_model=ImageOut)
async def set_primary_image(
    product_id: int,
    image_id: int,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    image = await product_service.set_primary_image(db, product_id, image_id)
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
    return {"message": "Image order updated"}


@router.delete("/{product_id}/images/{image_id}", response_model=MessageResponse)
async def delete_product_image(
    product_id: int,
    image_id: int,
    admin: User = require_module("products"),
    db: AsyncSession = Depends(get_db),
):
    await product_service.delete_product_image(db, product_id, image_id)
    return {"message": "Image deleted successfully"}
