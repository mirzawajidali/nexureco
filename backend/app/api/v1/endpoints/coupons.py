from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_optional_user
from app.schemas.cart import CouponCheckRequest
from app.services import coupon_service
from app.models.user import User

router = APIRouter(prefix="/coupons", tags=["Coupons"])


@router.post("/validate")
async def validate_coupon(
    data: CouponCheckRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Check a promo code against the bag subtotal (guests too). Checkout validates it again with the real order."""
    result = await coupon_service.validate_coupon(
        db, data.code, user.id if user else None, data.subtotal, email=user.email if user else None
    )
    return {
        "code": result["code"],
        "type": result["type"],
        "value": result["value"],
        "discount_amount": result["discount_amount"],
        "description": result["description"],
    }
