from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.coupon import Coupon, CouponUsage
from app.core.exceptions import BadRequestException


async def validate_coupon(
    db: AsyncSession, code: str, user_id: int | None, subtotal: float
) -> dict:
    """Validate a coupon and return discount info."""
    result = await db.execute(
        select(Coupon).where(Coupon.code == code.upper(), Coupon.is_active == True)
    )
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise BadRequestException("Invalid coupon code")

    now = datetime.now(timezone.utc)

    if coupon.starts_at and coupon.starts_at.replace(tzinfo=timezone.utc) > now:
        raise BadRequestException("Coupon is not yet active")

    if coupon.expires_at and coupon.expires_at.replace(tzinfo=timezone.utc) < now:
        raise BadRequestException("Coupon has expired")

    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        raise BadRequestException("Coupon usage limit reached")

    # Check per-customer usage (only for logged-in users)
    if user_id is not None:
        usage_count = await db.execute(
            select(func.count(CouponUsage.id)).where(
                CouponUsage.coupon_id == coupon.id,
                CouponUsage.user_id == user_id,
            )
        )
        if usage_count.scalar() >= coupon.usage_per_customer:
            raise BadRequestException("You have already used this coupon")

    if float(coupon.min_order_amount) > subtotal:
        raise BadRequestException(
            f"Minimum order amount of Rs. {int(coupon.min_order_amount)} required"
        )

    # Calculate discount
    if coupon.type == "percentage":
        discount = subtotal * (float(coupon.value) / 100)
        if coupon.max_discount:
            discount = min(discount, float(coupon.max_discount))
    else:
        discount = float(coupon.value)

    discount = min(discount, subtotal)

    return {
        "coupon_id": coupon.id,
        "code": coupon.code,
        "type": coupon.type,
        "value": float(coupon.value),
        "discount_amount": round(discount, 2),
        "description": coupon.description,
    }


async def record_coupon_usage(
    db: AsyncSession, coupon_id: int, user_id: int, order_id: int
) -> None:
    db.add(CouponUsage(coupon_id=coupon_id, user_id=user_id, order_id=order_id))
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if coupon:
        coupon.used_count += 1
    await db.flush()
