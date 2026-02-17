from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, text
from sqlalchemy.orm import selectinload
from app.models.product import (
    Product, ProductImage, ProductOption, ProductOptionValue,
    ProductVariant, VariantOptionValue,
)
from app.models.category import Category
from app.models.collection import CollectionProduct
from app.schemas.product import ProductCreate, ProductUpdate
from app.utils.slug import generate_unique_slug
from app.utils.pagination import paginate
from app.core.exceptions import NotFoundException


def _product_eager_options():
    return [
        selectinload(Product.images),
        selectinload(Product.options).selectinload(ProductOption.values),
        selectinload(Product.variants).selectinload(ProductVariant.option_values),
        selectinload(Product.category),
    ]


def _build_list_item(product: Product) -> dict:
    primary_img = next((img.url for img in (product.images or []) if img.is_primary), None)
    if not primary_img and product.images:
        primary_img = product.images[0].url
    total_stock = sum(v.stock_quantity for v in (product.variants or []))
    variant_count = len(product.variants or [])
    # Collect unique variant images for hover thumbnails
    variant_images = list(dict.fromkeys(
        v.image_url for v in (product.variants or []) if v.image_url
    ))
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "short_description": product.short_description,
        "base_price": float(product.base_price),
        "compare_at_price": float(product.compare_at_price) if product.compare_at_price else None,
        "sku": product.sku,
        "status": product.status,
        "is_featured": product.is_featured,
        "avg_rating": float(product.avg_rating),
        "review_count": product.review_count,
        "total_sold": product.total_sold,
        "primary_image": primary_img,
        "category_name": product.category.name if product.category else None,
        "total_stock": total_stock,
        "variant_count": variant_count,
        "variant_images": variant_images,
        "tags": product.tags,
        "created_at": product.created_at,
    }


def _build_detail(product: Product) -> dict:
    return {
        "id": product.id,
        "category_id": product.category_id,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "short_description": product.short_description,
        "base_price": float(product.base_price),
        "compare_at_price": float(product.compare_at_price) if product.compare_at_price else None,
        "cost_price": float(product.cost_price) if product.cost_price else None,
        "sku": product.sku,
        "barcode": product.barcode,
        "weight": float(product.weight) if product.weight else None,
        "requires_shipping": product.requires_shipping,
        "status": product.status,
        "is_featured": product.is_featured,
        "tags": product.tags,
        "meta_title": product.meta_title,
        "meta_description": product.meta_description,
        "avg_rating": float(product.avg_rating),
        "review_count": product.review_count,
        "total_sold": product.total_sold,
        "images": product.images,
        "options": product.options,
        "variants": product.variants,
        "category_name": product.category.name if product.category else None,
        "category_slug": product.category.slug if product.category else None,
        "created_at": product.created_at,
        "updated_at": product.updated_at,
    }


async def list_products(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    category_slug: str | None = None,
    collection_slug: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str = "newest",
    status: str | None = "active",
    is_featured: bool | None = None,
    q: str | None = None,
    product_ids: list[int] | None = None,
) -> dict:
    query = select(Product).options(*_product_eager_options())

    if product_ids:
        query = query.where(Product.id.in_(product_ids))
    if status:
        query = query.where(Product.status == status)
    if is_featured is not None:
        query = query.where(Product.is_featured == is_featured)
    if min_price is not None:
        query = query.where(Product.base_price >= min_price)
    if max_price is not None:
        query = query.where(Product.base_price <= max_price)

    if category_slug:
        query = query.join(Category).where(Category.slug == category_slug)
    if collection_slug:
        query = query.join(CollectionProduct).join(
            CollectionProduct.__table__.c.collection_id.__eq__(
                select(CollectionProduct.collection_id)
                .join(Product)
                .correlate(Product)
                .scalar_subquery()
            )
        )

    if q:
        search_term = f"%{q}%"
        query = query.where(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Product.short_description.ilike(search_term),
            )
        )

    # Sorting
    sort_map = {
        "newest": Product.created_at.desc(),
        "oldest": Product.created_at.asc(),
        "price_asc": Product.base_price.asc(),
        "price_desc": Product.base_price.desc(),
        "name_asc": Product.name.asc(),
        "name_desc": Product.name.desc(),
        "popular": Product.total_sold.desc(),
        "rating": Product.avg_rating.desc(),
    }
    query = query.order_by(sort_map.get(sort, Product.created_at.desc()))

    result = await paginate(db, query, page, page_size)
    result["items"] = [_build_list_item(p) for p in result["items"]]
    return result


async def get_product_by_slug(db: AsyncSession, slug: str) -> dict:
    result = await db.execute(
        select(Product).options(*_product_eager_options()).where(Product.slug == slug)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise NotFoundException("Product not found")
    return _build_detail(product)


async def get_product_by_id(db: AsyncSession, product_id: int) -> Product:
    result = await db.execute(
        select(Product).options(*_product_eager_options()).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise NotFoundException("Product not found")
    return product


async def create_product(db: AsyncSession, data: ProductCreate) -> dict:
    slug = await generate_unique_slug(db, Product, Product.slug, data.name)

    product = Product(
        name=data.name,
        slug=slug,
        category_id=data.category_id,
        description=data.description,
        short_description=data.short_description,
        base_price=data.base_price,
        compare_at_price=data.compare_at_price,
        cost_price=data.cost_price,
        sku=data.sku,
        barcode=data.barcode,
        weight=data.weight,
        requires_shipping=data.requires_shipping,
        status=data.status,
        is_featured=data.is_featured,
        tags=data.tags,
        meta_title=data.meta_title,
        meta_description=data.meta_description,
    )
    db.add(product)
    await db.flush()

    # Create options and values
    all_option_values = []
    for opt_data in data.options:
        option = ProductOption(product_id=product.id, name=opt_data.name)
        db.add(option)
        await db.flush()
        for val_data in opt_data.values:
            ov = ProductOptionValue(option_id=option.id, value=val_data.value)
            db.add(ov)
            await db.flush()
            all_option_values.append(ov)

    # Create variants
    for var_data in data.variants:
        variant = ProductVariant(
            product_id=product.id,
            sku=var_data.sku,
            price=var_data.price,
            compare_at_price=var_data.compare_at_price,
            cost_price=var_data.cost_price,
            stock_quantity=var_data.stock_quantity,
            low_stock_threshold=var_data.low_stock_threshold,
            image_url=var_data.image_url,
        )
        db.add(variant)
        await db.flush()
        for idx in var_data.option_value_indices:
            if 0 <= idx < len(all_option_values):
                db.add(VariantOptionValue(
                    variant_id=variant.id,
                    option_value_id=all_option_values[idx].id,
                ))
        await db.flush()

    # Reload with relationships
    product = await get_product_by_id(db, product.id)
    return _build_detail(product)


async def update_product(db: AsyncSession, product_id: int, data: ProductUpdate) -> dict:
    product = await get_product_by_id(db, product_id)
    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] != product.name:
        update_data["slug"] = await generate_unique_slug(db, Product, Product.slug, update_data["name"])

    # Extract options/variants before updating basic fields
    new_options_data = update_data.pop("options", None)
    new_variants_data = update_data.pop("variants", None)

    for key, value in update_data.items():
        setattr(product, key, value)
    await db.flush()

    # If options were provided, delete-and-recreate options + variants
    if new_options_data is not None:
        # Delete existing variants first (they reference option values)
        existing_variants = await db.execute(
            select(ProductVariant).where(ProductVariant.product_id == product_id)
        )
        for variant in existing_variants.scalars().all():
            await db.delete(variant)
        await db.flush()

        # Delete existing options (cascades to option_values)
        existing_options = await db.execute(
            select(ProductOption).where(ProductOption.product_id == product_id)
        )
        for option in existing_options.scalars().all():
            await db.delete(option)
        await db.flush()

        # Recreate options and collect all option values in flat list
        all_option_values = []
        for idx, opt_data in enumerate(new_options_data):
            option = ProductOption(
                product_id=product_id,
                name=opt_data["name"],
                display_order=idx,
            )
            db.add(option)
            await db.flush()
            for val_idx, val_data in enumerate(opt_data["values"]):
                ov = ProductOptionValue(
                    option_id=option.id,
                    value=val_data["value"],
                    display_order=val_idx,
                )
                db.add(ov)
                await db.flush()
                all_option_values.append(ov)

        # Recreate variants if provided
        if new_variants_data is not None:
            for var_data in new_variants_data:
                variant = ProductVariant(
                    product_id=product_id,
                    sku=var_data.get("sku"),
                    price=var_data.get("price"),
                    compare_at_price=var_data.get("compare_at_price"),
                    cost_price=var_data.get("cost_price"),
                    stock_quantity=var_data.get("stock_quantity", 0),
                    low_stock_threshold=var_data.get("low_stock_threshold", 5),
                    image_url=var_data.get("image_url"),
                )
                db.add(variant)
                await db.flush()
                for idx in var_data.get("option_value_indices", []):
                    if 0 <= idx < len(all_option_values):
                        db.add(VariantOptionValue(
                            variant_id=variant.id,
                            option_value_id=all_option_values[idx].id,
                        ))
                await db.flush()

    product = await get_product_by_id(db, product_id)
    return _build_detail(product)


async def delete_product(db: AsyncSession, product_id: int) -> None:
    product = await get_product_by_id(db, product_id)
    await db.delete(product)
    await db.flush()


async def add_product_image(
    db: AsyncSession, product_id: int, url: str, alt_text: str | None = None, is_primary: bool = False
) -> ProductImage:
    await get_product_by_id(db, product_id)

    # Auto-set as primary if this is the first image
    existing_count = await db.execute(
        select(func.count()).select_from(ProductImage).where(ProductImage.product_id == product_id)
    )
    if existing_count.scalar() == 0:
        is_primary = True

    if is_primary:
        existing = await db.execute(
            select(ProductImage).where(ProductImage.product_id == product_id, ProductImage.is_primary == True)
        )
        for img in existing.scalars().all():
            img.is_primary = False

    # Get max display order
    max_order = await db.execute(
        select(func.max(ProductImage.display_order)).where(ProductImage.product_id == product_id)
    )
    next_order = (max_order.scalar() or 0) + 1

    image = ProductImage(
        product_id=product_id,
        url=url,
        alt_text=alt_text,
        display_order=next_order,
        is_primary=is_primary,
    )
    db.add(image)
    await db.flush()
    await db.refresh(image)
    return image


async def set_primary_image(db: AsyncSession, product_id: int, image_id: int) -> ProductImage:
    await get_product_by_id(db, product_id)

    # Unset all primary flags for this product
    existing = await db.execute(
        select(ProductImage).where(ProductImage.product_id == product_id, ProductImage.is_primary == True)
    )
    for img in existing.scalars().all():
        img.is_primary = False

    # Set the target image as primary
    result = await db.execute(
        select(ProductImage).where(ProductImage.id == image_id, ProductImage.product_id == product_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise NotFoundException("Image not found")
    image.is_primary = True
    await db.flush()
    await db.refresh(image)
    return image


async def reorder_product_images(db: AsyncSession, product_id: int, image_ids: list[int]) -> None:
    result = await db.execute(
        select(ProductImage).where(ProductImage.product_id == product_id)
    )
    images = {img.id: img for img in result.scalars().all()}
    for order, img_id in enumerate(image_ids):
        if img_id in images:
            images[img_id].display_order = order
    await db.flush()


async def delete_product_image(db: AsyncSession, product_id: int, image_id: int) -> None:
    result = await db.execute(
        select(ProductImage).where(ProductImage.id == image_id, ProductImage.product_id == product_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise NotFoundException("Image not found")
    await db.delete(image)
    await db.flush()


async def search_suggestions(db: AsyncSession, q: str, limit: int = 8) -> list[dict]:
    search_term = f"%{q}%"
    result = await db.execute(
        select(Product.name, Product.slug)
        .where(Product.status == "active", Product.name.ilike(search_term))
        .order_by(Product.total_sold.desc())
        .limit(limit)
    )
    return [{"name": row.name, "slug": row.slug} for row in result.all()]


async def get_products_by_category(
    db: AsyncSession, category_slug: str, page: int = 1, page_size: int = 20,
    min_price: float | None = None, max_price: float | None = None, sort: str = "newest",
) -> dict:
    query = (
        select(Product)
        .options(*_product_eager_options())
        .join(Category)
        .where(Category.slug == category_slug, Product.status == "active")
    )
    if min_price is not None:
        query = query.where(Product.base_price >= min_price)
    if max_price is not None:
        query = query.where(Product.base_price <= max_price)

    sort_map = {
        "newest": Product.created_at.desc(),
        "price_asc": Product.base_price.asc(),
        "price_desc": Product.base_price.desc(),
        "popular": Product.total_sold.desc(),
        "rating": Product.avg_rating.desc(),
    }
    query = query.order_by(sort_map.get(sort, Product.created_at.desc()))

    result = await paginate(db, query, page, page_size)
    result["items"] = [_build_list_item(p) for p in result["items"]]
    return result


async def get_products_by_collection(
    db: AsyncSession, collection_slug: str, page: int = 1, page_size: int = 20,
    sort: str = "newest",
) -> dict:
    from app.models.collection import Collection

    # Get collection id
    col_result = await db.execute(select(Collection.id).where(Collection.slug == collection_slug))
    col_id = col_result.scalar_one_or_none()
    if not col_id:
        raise NotFoundException("Collection not found")

    query = (
        select(Product)
        .options(*_product_eager_options())
        .join(CollectionProduct, Product.id == CollectionProduct.product_id)
        .where(CollectionProduct.collection_id == col_id, Product.status == "active")
    )
    sort_map = {
        "newest": Product.created_at.desc(),
        "price_asc": Product.base_price.asc(),
        "price_desc": Product.base_price.desc(),
        "popular": Product.total_sold.desc(),
        "rating": Product.avg_rating.desc(),
    }
    query = query.order_by(sort_map.get(sort, Product.created_at.desc()))

    result = await paginate(db, query, page, page_size)
    result["items"] = [_build_list_item(p) for p in result["items"]]
    return result
