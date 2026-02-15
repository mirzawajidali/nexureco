from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.models.cart import CartItem
from app.models.product import Product, ProductVariant, ProductImage, ProductOption, ProductOptionValue
from app.models.user import User
from app.core.exceptions import NotFoundException, BadRequestException


async def _build_cart_item_out(item: CartItem, db: AsyncSession) -> dict:
    """Build cart item response with product/variant details."""
    result = await db.execute(
        select(Product).options(selectinload(Product.images)).where(Product.id == item.product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise NotFoundException("Product not found")

    primary_img = next((img.url for img in product.images if img.is_primary), None)
    if not primary_img and product.images:
        primary_img = product.images[0].url

    unit_price = float(product.base_price)
    variant_info = None
    stock_available = None

    if item.variant_id:
        var_result = await db.execute(
            select(ProductVariant).where(ProductVariant.id == item.variant_id)
        )
        variant = var_result.scalar_one_or_none()
        if variant:
            if variant.price is not None:
                unit_price = float(variant.price)
            stock_available = variant.stock_quantity
            if variant.image_url:
                primary_img = variant.image_url

            # Build variant info string
            from sqlalchemy.orm import selectinload as sl
            from app.models.product import VariantOptionValue
            vov_result = await db.execute(
                select(VariantOptionValue).where(VariantOptionValue.variant_id == variant.id)
            )
            vov_rows = vov_result.scalars().all()
            parts = []
            for vov in vov_rows:
                ov_res = await db.execute(
                    select(ProductOptionValue).where(ProductOptionValue.id == vov.option_value_id)
                )
                ov = ov_res.scalar_one_or_none()
                if ov:
                    opt_res = await db.execute(
                        select(ProductOption).where(ProductOption.id == ov.option_id)
                    )
                    opt = opt_res.scalar_one_or_none()
                    if opt:
                        parts.append(f"{opt.name}: {ov.value}")
            variant_info = ", ".join(parts) if parts else None

    return {
        "id": item.id,
        "product_id": item.product_id,
        "variant_id": item.variant_id,
        "quantity": item.quantity,
        "product_name": product.name,
        "product_slug": product.slug,
        "product_image": primary_img,
        "variant_info": variant_info,
        "unit_price": unit_price,
        "total_price": unit_price * item.quantity,
        "stock_available": stock_available,
    }


async def get_cart(db: AsyncSession, user: User) -> dict:
    result = await db.execute(
        select(CartItem).where(CartItem.user_id == user.id).order_by(CartItem.created_at)
    )
    items = result.scalars().all()

    cart_items = []
    subtotal = 0
    for item in items:
        item_out = await _build_cart_item_out(item, db)
        cart_items.append(item_out)
        subtotal += item_out["total_price"]

    return {
        "items": cart_items,
        "subtotal": subtotal,
        "item_count": sum(i["quantity"] for i in cart_items),
    }


async def add_to_cart(
    db: AsyncSession, user: User, product_id: int, variant_id: int | None, quantity: int
) -> dict:
    # Verify product exists
    prod = await db.execute(select(Product).where(Product.id == product_id, Product.status == "active"))
    if not prod.scalar_one_or_none():
        raise NotFoundException("Product not found or not active")

    # Verify variant if provided
    if variant_id:
        var = await db.execute(
            select(ProductVariant).where(
                ProductVariant.id == variant_id,
                ProductVariant.product_id == product_id,
                ProductVariant.is_active == True,
            )
        )
        variant = var.scalar_one_or_none()
        if not variant:
            raise NotFoundException("Variant not found")
        if variant.stock_quantity < quantity:
            raise BadRequestException(f"Only {variant.stock_quantity} items available")

    # Check if already in cart
    existing = await db.execute(
        select(CartItem).where(
            CartItem.user_id == user.id,
            CartItem.product_id == product_id,
            CartItem.variant_id == variant_id if variant_id else CartItem.variant_id.is_(None),
        )
    )
    cart_item = existing.scalar_one_or_none()

    if cart_item:
        cart_item.quantity += quantity
    else:
        cart_item = CartItem(
            user_id=user.id,
            product_id=product_id,
            variant_id=variant_id,
            quantity=quantity,
        )
        db.add(cart_item)

    await db.flush()
    return await get_cart(db, user)


async def update_cart_item(db: AsyncSession, user: User, item_id: int, quantity: int) -> dict:
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException("Cart item not found")

    if item.variant_id:
        var = await db.execute(select(ProductVariant).where(ProductVariant.id == item.variant_id))
        variant = var.scalar_one_or_none()
        if variant and variant.stock_quantity < quantity:
            raise BadRequestException(f"Only {variant.stock_quantity} items available")

    item.quantity = quantity
    await db.flush()
    return await get_cart(db, user)


async def remove_cart_item(db: AsyncSession, user: User, item_id: int) -> dict:
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException("Cart item not found")
    await db.delete(item)
    await db.flush()
    return await get_cart(db, user)


async def clear_cart(db: AsyncSession, user: User) -> None:
    await db.execute(delete(CartItem).where(CartItem.user_id == user.id))
    await db.flush()
