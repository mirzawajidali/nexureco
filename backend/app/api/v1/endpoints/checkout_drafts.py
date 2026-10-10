from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_optional_user
from app.db.database import get_db
from app.models.user import User
from app.services import abandoned_checkout_service as drafts

router = APIRouter(prefix="/checkout-drafts", tags=["Checkout"])


@router.put("/{token}", status_code=204)
async def save_checkout_draft(
    token: str,
    data: drafts.CheckoutDraftIn,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Save the bag and contact details of a checkout in progress (for a reminder if it isn't finished)."""
    await drafts.save_draft(db, token, data, user.id if user else None)


@router.get("/{token}")
async def restore_checkout_draft(token: str, db: AsyncSession = Depends(get_db)):
    """The saved bag behind a reminder link, with current names and prices."""
    return {"items": await drafts.restore_lines(db, token)}
