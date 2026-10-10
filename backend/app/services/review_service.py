import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.order import Order, OrderItem
from app.models.review import Review, ReviewImage
from app.models.product import Product
from app.models.user import User
from app.schemas.review import ReviewCreate, VerifiedReviewCreate
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

    # "Verified purchase" when this customer has received the product in a delivered order
    delivered_order_id = (await db.execute(
        select(Order.id)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .where(Order.user_id == user_id, Order.status == "delivered", OrderItem.product_id == data.product_id)
        .limit(1)
    )).scalar_one_or_none()

    review = Review(
        product_id=data.product_id,
        user_id=user_id,
        order_id=delivered_order_id,
        is_verified=delivered_order_id is not None,
        rating=data.rating,
        title=data.title,
        comment=data.comment,
        is_approved=True,  # Auto-approve for now
    )
    db.add(review)
    await db.flush()

    # Update product avg rating
    await _update_product_rating(db, data.product_id)

    review = await _reload_with_images(db, review.id)
    user = await db.get(User, user_id)
    return _build_review_out(review, user)


# One message for every failed check, so the form can't be used to find out which order numbers exist
_ORDER_NOT_MATCHED = (
    "We couldn't find a delivered order with this order number and email or phone that includes this product."
)


def _same_phone(a: str | None, b: str | None) -> bool:
    """Phone numbers match on their last 10 digits (0316..., +92 316..., 92316... are the same number)."""
    da, db_ = re.sub(r"\D", "", a or ""), re.sub(r"\D", "", b or "")
    return len(da) >= 10 and len(db_) >= 10 and da[-10:] == db_[-10:]


async def create_verified_review(db: AsyncSession, data: VerifiedReviewCreate) -> dict:
    """A review without an account, verified by a delivered order that contains the product."""
    order_number = data.order_number.strip().lstrip("#").upper()
    order = (await db.execute(
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.items))
        .where(func.upper(Order.order_number) == order_number)
    )).scalar_one_or_none()

    contact = data.contact.strip()
    if order:
        if "@" in contact:
            emails = {e.lower() for e in (order.guest_email, order.user.email if order.user else None) if e}
            contact_ok = contact.lower() in emails
        else:
            contact_ok = _same_phone(contact, order.shipping_phone)
    if (
        not order
        or not contact_ok
        or order.status != "delivered"
        or not any(item.product_id == data.product_id for item in order.items)
    ):
        raise BadRequestException(_ORDER_NOT_MATCHED)

    duplicate = Review.order_id == order.id
    if order.user_id:
        duplicate = duplicate | (Review.user_id == order.user_id)
    existing = await db.execute(select(Review.id).where(Review.product_id == data.product_id, duplicate))
    if existing.first():
        raise ConflictException("This product has already been reviewed for this order")

    review = Review(
        product_id=data.product_id,
        user_id=order.user_id,
        order_id=order.id,
        reviewer_name=(data.name or "").strip() or order.shipping_first_name or "Customer",
        is_verified=True,
        rating=data.rating,
        title=data.title,
        comment=data.comment,
        is_approved=True,  # Verified buyers are published straight away, like account reviews
    )
    db.add(review)
    await db.flush()
    await _update_product_rating(db, data.product_id)
    review = await _reload_with_images(db, review.id)
    return _build_review_out(review, order.user)


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

    # Batch-load all users in one query instead of N individual queries
    reviews = result["items"]
    user_ids = list({r.user_id for r in reviews if r.user_id})
    if user_ids:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        user_map = {u.id: u for u in users_result.scalars()}
    else:
        user_map = {}

    result["items"] = [
        _build_review_out(review, user_map.get(review.user_id))
        for review in reviews
    ]
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

    # Rating breakdown — single grouped query instead of 5 separate queries
    breakdown_result = await db.execute(
        select(Review.rating, func.count(Review.id))
        .where(Review.product_id == product_id, Review.is_approved == True)
        .group_by(Review.rating)
    )
    breakdown_map = dict(breakdown_result.all())
    breakdown = {str(i): breakdown_map.get(i, 0) for i in range(1, 6)}

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


async def _reload_with_images(db: AsyncSession, review_id: int) -> Review:
    """The review with its images loaded: _build_review_out reads them, and async sessions can't lazy-load."""
    return (await db.execute(
        select(Review)
        .options(selectinload(Review.images))
        .where(Review.id == review_id)
        .execution_options(populate_existing=True)
    )).scalar_one()


def _build_review_out(review: Review, user: User | None) -> dict:
    return {
        "id": review.id,
        "product_id": review.product_id,
        "user_name": review.reviewer_name or (user.first_name if user else None) or "Customer",
        "rating": review.rating,
        "title": review.title,
        "comment": review.comment,
        "is_approved": review.is_approved,
        "is_verified": bool(review.is_verified),
        "helpful_count": review.helpful_count,
        "images": [{"id": img.id, "url": img.url} for img in (review.images or [])],
        "created_at": review.created_at,
    }
