from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, text, delete as sa_delete
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import set_committed_value
from app.models.product import (
    Product, ProductImage, ProductOption, ProductOptionValue,
    ProductVariant, VariantOptionValue,
)
from app.models.category import Category
from app.models.collection import CollectionProduct
from app.models.media import InventoryLog
from app.models.order import OrderItem
from app.schemas.product import OptionCreate, ProductCreate, ProductUpdate, VariantCreate
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


# How many top sellers get the "Best seller" badge, so it keeps its meaning
BEST_SELLER_COUNT = 2


async def get_best_seller_ids(db: AsyncSession) -> frozenset[int]:
    """IDs of the top-selling active products (the ones that show a "Best seller" badge)."""
    result = await db.execute(
        select(Product.id)
        .where(Product.status == "active", Product.total_sold > 0)
        .order_by(Product.total_sold.desc())
        .limit(BEST_SELLER_COUNT)
    )
    return frozenset(result.scalars())


def _build_list_item(product: Product, best_seller_ids: frozenset[int] = frozenset()) -> dict:
    primary_img = next((img.url for img in (product.images or []) if img.is_primary), None)
    if not primary_img and product.images:
        primary_img = product.images[0].url
    variants = product.variants or []
    total_stock = sum(v.stock_quantity for v in variants)
    active_variants = [v for v in variants if v.is_active]
    in_stock = any(v.stock_quantity > 0 for v in active_variants) if active_variants else True
    # Unique variant images for hover thumbnails, plus each one's colour name for alt text
    colour_names = {
        value.id: value.value
        for option in (product.options or []) if option.name.strip().lower() in ("color", "colour")
        for value in (option.values or [])
    }
    variant_images: list[str] = []
    variant_colors: list[str | None] = []
    for v in variants:
        if v.image_url and v.image_url not in variant_images:
            variant_images.append(v.image_url)
            variant_colors.append(next(
                (colour_names[ov.option_value_id] for ov in (v.option_values or []) if ov.option_value_id in colour_names),
                None,
            ))
    variant_count = len(variant_images)
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
        "variant_colors": variant_colors,
        "in_stock": in_stock,
        "is_best_seller": product.id in best_seller_ids,
        "tags": product.tags,
        "created_at": product.created_at.isoformat() if product.created_at else None,
    }


def _build_detail(product: Product) -> dict:
    images = [
        {"id": img.id, "url": img.url, "alt_text": img.alt_text,
         "display_order": img.display_order, "is_primary": img.is_primary}
        for img in (product.images or [])
    ]
    options = [
        {"id": opt.id, "name": opt.name, "display_order": opt.display_order,
         "values": [{"id": v.id, "value": v.value, "display_order": v.display_order}
                    for v in (opt.values or [])]}
        for opt in (product.options or [])
    ]
    variants = [
        {"id": v.id, "sku": v.sku, "price": float(v.price) if v.price else None,
         "compare_at_price": float(v.compare_at_price) if v.compare_at_price else None,
         "cost_price": float(v.cost_price) if v.cost_price else None,
         "stock_quantity": v.stock_quantity, "low_stock_threshold": v.low_stock_threshold,
         "is_active": v.is_active, "image_url": v.image_url,
         "option_values": [{"option_value_id": ov.option_value_id}
                           for ov in (v.option_values or [])]}
        for v in (product.variants or [])
    ]
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
        "images": images,
        "options": options,
        "variants": variants,
        "category_name": product.category.name if product.category else None,
        "category_slug": product.category.slug if product.category else None,
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "updated_at": product.updated_at.isoformat() if product.updated_at else None,
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
    category_ids: list[int] | None = None,
    stock: str | None = None,
) -> dict:
    query = select(Product).options(*_product_eager_options())

    if product_ids:
        query = query.where(Product.id.in_(product_ids))
    if category_ids is not None:
        query = query.where(Product.category_id.in_(category_ids or [-1]))
    if stock in ("in_stock", "out_of_stock"):
        # Same as the list's "total_stock": all variants' stock added up
        total_stock = (
            select(func.coalesce(func.sum(ProductVariant.stock_quantity), 0))
            .where(ProductVariant.product_id == Product.id)
            .correlate(Product)
            .scalar_subquery()
        )
        query = query.where(total_stock > 0 if stock == "in_stock" else total_stock <= 0)
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
    best_seller_ids = await get_best_seller_ids(db)
    result["items"] = [_build_list_item(p, best_seller_ids) for p in result["items"]]
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
            low_stock_threshold=var_data.low_stock_threshold if var_data.low_stock_threshold is not None else 5,
            is_active=var_data.is_active if var_data.is_active is not None else True,
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

    # Index in Elasticsearch
    from app.services.es_indexing_service import index_product
    await index_product(product)

    return _build_detail(product)


def _norm(text_value: str) -> str:
    return " ".join(text_value.split()).casefold()


async def _sync_options_and_variants(
    db: AsyncSession,
    product_id: int,
    options_in: list[OptionCreate],
    variants_in: list[VariantCreate] | None,
) -> None:
    """Bring a product's options and variants in line with the admin form, in place.

    Options and values are matched by name and variants by id (or, failing that, by their option values),
    so a save keeps variant ids: order lines, carts and stock history stay linked. Stock changes apply as
    the difference from what the form loaded (``stock_loaded``), so sales made while the form was open
    aren't overwritten. Fields the form doesn't send (sale/cost price, low-stock threshold, active) keep
    their values. Variants the form dropped are deleted, or deactivated if orders reference them.
    """
    options = (await db.execute(
        select(ProductOption).where(ProductOption.product_id == product_id)
        .options(selectinload(ProductOption.values))
    )).scalars().all()
    variants = (await db.execute(
        select(ProductVariant).where(ProductVariant.product_id == product_id)
        .options(
            selectinload(ProductVariant.option_values)
            .selectinload(VariantOptionValue.option_value)
            .selectinload(ProductOptionValue.option)
        )
    )).scalars().all()

    def combo(pairs) -> frozenset:
        return frozenset((_norm(option_name), _norm(value)) for option_name, value in pairs)

    existing_combo = {
        v.id: combo((link.option_value.option.name, link.option_value.value) for link in v.option_values)
        for v in variants
    }

    if variants_in is not None and variants:
        # Option links are rewritten below for every variant the form keeps
        await db.execute(sa_delete(VariantOptionValue).where(
            VariantOptionValue.variant_id.in_([v.id for v in variants])
        ))
        for v in variants:
            set_committed_value(v, "option_values", [])

    # Options and their values, matched by name; `flat` follows the form's option_value_indices order
    flat: list[tuple[str, ProductOptionValue]] = []
    remaining_options = {_norm(o.name): o for o in options}
    for idx, opt_in in enumerate(options_in):
        option = remaining_options.pop(_norm(opt_in.name), None)
        if option is None:
            option = ProductOption(product_id=product_id, name=opt_in.name, display_order=idx)
            db.add(option)
            await db.flush()
            remaining_values: dict[str, ProductOptionValue] = {}
        else:
            option.name = opt_in.name
            option.display_order = idx
            remaining_values = {_norm(v.value): v for v in option.values}
        for val_idx, val_in in enumerate(opt_in.values):
            value = remaining_values.pop(_norm(val_in.value), None)
            if value is None:
                value = ProductOptionValue(option_id=option.id, value=val_in.value, display_order=val_idx)
                db.add(value)
            else:
                value.value = val_in.value
                value.display_order = val_idx
            flat.append((opt_in.name, value))
        for gone in remaining_values.values():
            await db.delete(gone)
    for gone in remaining_options.values():
        await db.delete(gone)
    await db.flush()

    if variants_in is None:
        return

    unmatched = {v.id: v for v in variants}
    for var_in in variants_in:
        picked = [flat[i] for i in dict.fromkeys(var_in.option_value_indices) if 0 <= i < len(flat)]
        key = combo((option_name, value.value) for option_name, value in picked)
        variant = unmatched.pop(var_in.id, None) if var_in.id is not None else None
        if variant is None:
            variant = next((v for vid, v in unmatched.items() if existing_combo[vid] == key), None)
            if variant is not None:
                del unmatched[variant.id]

        if variant is None:
            variant = ProductVariant(
                product_id=product_id,
                sku=var_in.sku,
                price=var_in.price,
                compare_at_price=var_in.compare_at_price,
                cost_price=var_in.cost_price,
                stock_quantity=var_in.stock_quantity,
                low_stock_threshold=var_in.low_stock_threshold if var_in.low_stock_threshold is not None else 5,
                is_active=var_in.is_active if var_in.is_active is not None else True,
                image_url=var_in.image_url,
            )
            db.add(variant)
            await db.flush()
        else:
            sent = var_in.model_fields_set
            variant.sku = var_in.sku
            variant.price = var_in.price
            variant.image_url = var_in.image_url
            if "compare_at_price" in sent:
                variant.compare_at_price = var_in.compare_at_price
            if "cost_price" in sent:
                variant.cost_price = var_in.cost_price
            if var_in.low_stock_threshold is not None:
                variant.low_stock_threshold = var_in.low_stock_threshold
            if var_in.is_active is not None:
                variant.is_active = var_in.is_active
            # The form's change in stock, applied to the live count (orders may have come in meanwhile)
            if var_in.stock_loaded is not None:
                change = var_in.stock_quantity - var_in.stock_loaded
            else:
                change = var_in.stock_quantity - variant.stock_quantity
            if change:
                variant.stock_quantity = ProductVariant.stock_quantity + change
                db.add(InventoryLog(
                    variant_id=variant.id, quantity_change=change, reason="manual_adjustment",
                    note="Changed on the product page",
                ))

        for _, value in picked:
            db.add(VariantOptionValue(variant_id=variant.id, option_value_id=value.id))

    if unmatched:
        ordered = set((await db.execute(
            select(OrderItem.variant_id).where(OrderItem.variant_id.in_(list(unmatched))).distinct()
        )).scalars())
        for vid, variant in unmatched.items():
            if vid in ordered:
                variant.is_active = False  # keep for order history and restocking
            else:
                await db.delete(variant)
    await db.flush()


async def update_product(db: AsyncSession, product_id: int, data: ProductUpdate) -> dict:
    product = await get_product_by_id(db, product_id)
    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] != product.name:
        update_data["slug"] = await generate_unique_slug(db, Product, Product.slug, update_data["name"])

    # Options/variants are synced separately, not set as plain fields
    update_data.pop("options", None)
    update_data.pop("variants", None)

    for key, value in update_data.items():
        setattr(product, key, value)
    await db.flush()

    if data.options is not None:
        await _sync_options_and_variants(db, product_id, data.options, data.variants)
        # Kept variants had their option links rewritten with plain SQL: reload everything fresh
        db.expire_all()

    product = await get_product_by_id(db, product_id)

    # Update Elasticsearch index
    from app.services.es_indexing_service import index_product
    await index_product(product)

    return _build_detail(product)


async def refresh_product(db: AsyncSession, product_id: int) -> None:
    """After an admin change to a product (stock, photos, reviews, details): save it, then update the search
    index and clear the shop's cached copies, so the shop and search show the change straight away.

    Committing first matters: clearing the cache before the commit lets a shop visit in between cache the
    old data again for the cache's lifetime.
    """
    await db.commit()
    from app.db.redis import CacheService
    from app.services.es_indexing_service import index_product
    try:
        product = await get_product_by_id(db, product_id)
    except NotFoundException:
        await CacheService.invalidate_product()
        return
    await index_product(product)
    await CacheService.invalidate_product(slug=product.slug)


async def delete_product(db: AsyncSession, product_id: int) -> None:
    product = await get_product_by_id(db, product_id)
    await db.delete(product)
    await db.flush()

    # Remove from Elasticsearch index
    from app.services.es_indexing_service import delete_product_from_index
    await delete_product_from_index(product_id)


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
    primary_img = (
        select(ProductImage.url)
        .where(ProductImage.product_id == Product.id, ProductImage.is_primary == True)
        .correlate(Product)
        .limit(1)
        .scalar_subquery()
    )
    first_img = (
        select(ProductImage.url)
        .where(ProductImage.product_id == Product.id)
        .correlate(Product)
        .order_by(ProductImage.display_order)
        .limit(1)
        .scalar_subquery()
    )
    result = await db.execute(
        select(
            Product.name,
            Product.slug,
            func.coalesce(primary_img, first_img).label("image"),
        )
        .where(Product.status == "active", Product.name.ilike(search_term))
        .order_by(Product.total_sold.desc())
        .limit(limit)
    )
    return [{"name": row.name, "slug": row.slug, "image": row.image} for row in result.all()]


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
    best_seller_ids = await get_best_seller_ids(db)
    result["items"] = [_build_list_item(p, best_seller_ids) for p in result["items"]]
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
    best_seller_ids = await get_best_seller_ids(db)
    result["items"] = [_build_list_item(p, best_seller_ids) for p in result["items"]]
    return result
