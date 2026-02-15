from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.review import Review, ReviewImage
from app.models.product import Product
from app.models.user import User
from app.schemas.review import ReviewCreate
from app.core.exceptions import NotFoundException, ConflictException, BadRequestException
from app.utils.pagination import paginate


async def create_review(db: AsyncSession, user_id: int, data: ReviewCreate) -> dict:
    # Check product exists
    prod = await db.execute(select(Product).where(Product.id == data.product_id))
    product = prod.scalar_one_or_none()
    if not product:
        raise NotFoundException("Product not found")

    # Check for duplicate
    existing = await db.execute(
        select(Review).where(Review.user_id == user_id, Review.product_id == data.product_id)
    )
    if existing.scalar_one_or_none():
        raise ConflictException("You have already reviewed this product")

    review = Review(
        product_id=data.product_id,
        user_id=user_id,
        rating=data.rating,
        title=data.title,
        comment=data.comment,
        is_approved=True,  # Auto-approve for now
    )
    db.add(review)
    await db.flush()

    # Update product avg rating
    await _update_product_rating(db, data.product_id)

    await db.refresh(review)
    user = await db.get(User, user_id)
    return _build_review_out(review, user)


async def get_product_reviews(
    db: AsyncSession, product_id: int, page: int = 1, page_size: int = 10
) -> dict:
    query = (
        select(Review)
        .options(selectinload(Review.images))
        .where(Review.product_id == product_id, Review.is_approved == True)
        .order_by(Review.created_at.desc())
    )
    result = await paginate(db, query, page, page_size)

    items = []
    for review in result["items"]:
        user = await db.get(User, review.user_id)
        items.append(_build_review_out(review, user))
    result["items"] = items
    return result


async def get_review_summary(db: AsyncSession, product_id: int) -> dict:
    result = await db.execute(
        select(
            func.avg(Review.rating),
            func.count(Review.id),
        )
        .where(Review.product_id == product_id, Review.is_approved == True)
    )
    row = result.one()
    avg_rating = float(row[0]) if row[0] else 0
    total_reviews = row[1]

    # Rating breakdown
    breakdown = {}
    for i in range(1, 6):
        count_result = await db.execute(
            select(func.count(Review.id)).where(
                Review.product_id == product_id,
                Review.is_approved == True,
                Review.rating == i,
            )
        )
        breakdown[str(i)] = count_result.scalar() or 0

    return {
        "avg_rating": round(avg_rating, 1),
        "total_reviews": total_reviews,
        "rating_breakdown": breakdown,
    }


async def _update_product_rating(db: AsyncSession, product_id: int):
    result = await db.execute(
        select(
            func.avg(Review.rating),
            func.count(Review.id),
        ).where(Review.product_id == product_id, Review.is_approved == True)
    )
    row = result.one()
    product = await db.get(Product, product_id)
    if product:
        product.avg_rating = float(row[0]) if row[0] else 0
        product.review_count = row[1]


def _build_review_out(review: Review, user: User | None) -> dict:
    return {
        "id": review.id,
        "product_id": review.product_id,
        "user_name": user.first_name if user else "Anonymous",
        "rating": review.rating,
        "title": review.title,
        "comment": review.comment,
        "is_approved": review.is_approved,
        "helpful_count": review.helpful_count,
        "images": [{"id": img.id, "url": img.url} for img in (review.images or [])],
        "created_at": review.created_at,
    }
