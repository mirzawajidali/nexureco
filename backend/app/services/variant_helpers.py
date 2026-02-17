from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product import (
    ProductOption, ProductOptionValue, VariantOptionValue,
)


async def build_variant_info(db: AsyncSession, variant_id: int) -> str | None:
    """Build 'Color: Red, Size: M' string with a single JOIN query."""
    rows = await db.execute(
        select(ProductOption.name, ProductOptionValue.value)
        .join(ProductOptionValue, ProductOptionValue.option_id == ProductOption.id)
        .join(VariantOptionValue, VariantOptionValue.option_value_id == ProductOptionValue.id)
        .where(VariantOptionValue.variant_id == variant_id)
        .order_by(ProductOption.display_order)
    )
    parts = [f"{name}: {value}" for name, value in rows.all()]
    return ", ".join(parts) if parts else None


async def build_variant_info_batch(
    db: AsyncSession, variant_ids: list[int]
) -> dict[int, str | None]:
    """Build variant info for multiple variants in a single query."""
    if not variant_ids:
        return {}

    rows = await db.execute(
        select(
            VariantOptionValue.variant_id,
            ProductOption.name,
            ProductOptionValue.value,
            ProductOption.display_order,
        )
        .join(ProductOptionValue, ProductOptionValue.option_id == ProductOption.id)
        .join(VariantOptionValue, VariantOptionValue.option_value_id == ProductOptionValue.id)
        .where(VariantOptionValue.variant_id.in_(variant_ids))
        .order_by(VariantOptionValue.variant_id, ProductOption.display_order)
    )

    from collections import defaultdict
    grouped: dict[int, list[str]] = defaultdict(list)
    for vid, opt_name, opt_value, _ in rows.all():
        grouped[vid].append(f"{opt_name}: {opt_value}")

    return {vid: ", ".join(parts) if parts else None for vid, parts in grouped.items()}
