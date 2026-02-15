from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.core.dependencies import require_module
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.user import User
from app.models.product import (
    ProductVariant, Product, ProductImage,
    VariantOptionValue, ProductOptionValue, ProductOption,
)
from app.models.media import InventoryLog
from app.schemas.common import PaginatedResponse, MessageResponse
from app.utils.pagination import paginate
from datetime import datetime

router = APIRouter(prefix="/admin/inventory", tags=["Admin Inventory"])


class InventoryItem(BaseModel):
    variant_id: int
    product_id: int
    product_name: str
    variant_title: str | None = None
    primary_image: str | None = None
    sku: str | None
    stock_quantity: int
    low_stock_threshold: int
    is_active: bool
    unavailable: int = 0
    committed: int = 0


class StockAdjustment(BaseModel):
    quantity_change: int
    reason: str
    note: str | None = None


class InventoryAdjusted(BaseModel):
    variant_id: int
    sku: str | None
    previous_stock: int
    new_stock: int
    quantity_change: int
    reason: str


@router.get("/", response_model=PaginatedResponse[InventoryItem])
async def list_inventory(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None),
    admin: User = require_module("inventory"),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(ProductVariant)
        .join(Product, ProductVariant.product_id == Product.id)
        .options(selectinload(ProductVariant.option_values))
        .order_by(Product.name.asc(), ProductVariant.id.asc())
    )

    if q:
        search_term = f"%{q}%"
        query = query.where(
            Product.name.ilike(search_term) | ProductVariant.sku.ilike(search_term)
        )

    result = await paginate(db, query, page=page, page_size=page_size)

    # Build response items with product name, variant title, image
    items = []
    for variant in result["items"]:
        product = await db.get(Product, variant.product_id)
        product_name = product.name if product else "Unknown"

        # Get variant option values as title (e.g., "Black", "S / Red")
        variant_title = None
        if variant.option_values:
            ov_ids = [ov.option_value_id for ov in variant.option_values]
            if ov_ids:
                ov_result = await db.execute(
                    select(ProductOptionValue.value)
                    .where(ProductOptionValue.id.in_(ov_ids))
                    .order_by(ProductOptionValue.id)
                )
                values = [row[0] for row in ov_result.all()]
                if values:
                    variant_title = " / ".join(values)

        # Get primary image
        primary_image = None
        if product:
            img_result = await db.execute(
                select(ProductImage.url)
                .where(ProductImage.product_id == product.id)
                .order_by(ProductImage.is_primary.desc(), ProductImage.display_order.asc())
                .limit(1)
            )
            img_row = img_result.first()
            if img_row:
                primary_image = img_row[0]

        items.append(
            InventoryItem(
                variant_id=variant.id,
                product_id=variant.product_id,
                product_name=product_name,
                variant_title=variant_title,
                primary_image=primary_image if variant.image_url is None else variant.image_url,
                sku=variant.sku,
                stock_quantity=variant.stock_quantity,
                low_stock_threshold=variant.low_stock_threshold,
                is_active=variant.is_active,
            )
        )

    result["items"] = items
    return result


@router.put("/{variant_id}/adjust", response_model=InventoryAdjusted)
async def adjust_stock(
    variant_id: int,
    data: StockAdjustment,
    admin: User = require_module("inventory"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProductVariant).where(ProductVariant.id == variant_id)
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise NotFoundException("Variant not found")

    previous_stock = variant.stock_quantity
    new_stock = previous_stock + data.quantity_change

    if new_stock < 0:
        raise BadRequestException(
            f"Insufficient stock. Current: {previous_stock}, adjustment: {data.quantity_change}"
        )

    variant.stock_quantity = new_stock

    # Create inventory log entry
    log = InventoryLog(
        variant_id=variant_id,
        quantity_change=data.quantity_change,
        reason=data.reason,
        note=data.note,
    )
    db.add(log)
    await db.flush()

    return InventoryAdjusted(
        variant_id=variant.id,
        sku=variant.sku,
        previous_stock=previous_stock,
        new_stock=new_stock,
        quantity_change=data.quantity_change,
        reason=data.reason,
    )
