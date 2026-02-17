from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.core.dependencies import require_module
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.product import Product
from app.models.review import Review
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.review_service import _update_product_rating
from app.utils.pagination import paginate
from datetime import datetime

router = APIRouter(prefix="/admin/reviews", tags=["Admin Reviews"])


class AdminReviewItem(BaseModel):
    id: int
    product_id: int
    product_name: str
    user_id: int
    user_name: str
    rating: int
    title: str | None
    comment: str | None
    is_approved: bool
    helpful_count: int
    created_at: datetime


@router.get("/", response_model=PaginatedResponse[AdminReviewItem])
async def list_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_approved: bool | None = None,
    admin: User = require_module("reviews"),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Review)
        .options(selectinload(Review.product), selectinload(Review.user))
        .order_by(Review.created_at.desc())
    )
    if is_approved is not None:
        query = query.where(Review.is_approved == is_approved)

    result = await paginate(db, query, page=page, page_size=page_size)

    # Build items from eagerly-loaded relationships (zero extra queries)
    items = []
    for review in result["items"]:
        items.append(
            AdminReviewItem(
                id=review.id,
                product_id=review.product_id,
                product_name=review.product.name if review.product else "Unknown",
                user_id=review.user_id,
                user_name=review.user.first_name if review.user else "Unknown",
                rating=review.rating,
                title=review.title,
                comment=review.comment,
                is_approved=review.is_approved,
                helpful_count=review.helpful_count,
                created_at=review.created_at,
            )
        )

    result["items"] = items
    return result


@router.put("/{review_id}/approve", response_model=MessageResponse)
async def approve_review(
    review_id: int,
    admin: User = require_module("reviews"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise NotFoundException("Review not found")

    review.is_approved = True
    await db.flush()

    # Recalculate product rating
    await _update_product_rating(db, review.product_id)

    return {"message": "Review approved successfully"}


@router.put("/{review_id}/reject", response_model=MessageResponse)
async def reject_review(
    review_id: int,
    admin: User = require_module("reviews"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise NotFoundException("Review not found")

    review.is_approved = False
    await db.flush()

    # Recalculate product rating
    await _update_product_rating(db, review.product_id)

    return {"message": "Review rejected successfully"}


@router.delete("/{review_id}", response_model=MessageResponse)
async def delete_review(
    review_id: int,
    admin: User = require_module("reviews"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise NotFoundException("Review not found")

    product_id = review.product_id
    await db.delete(review)
    await db.flush()

    # Recalculate product rating after deletion
    await _update_product_rating(db, product_id)

    return {"message": "Review deleted successfully"}
