from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.review import ReviewCreate, ReviewOut, ReviewSummary
from app.services import review_service
from app.models.user import User

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("/", response_model=ReviewOut, status_code=201)
async def create_review(
    data: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await review_service.create_review(db, user.id, data)


@router.get("/product/{product_id}", response_model=dict)
async def get_product_reviews(
    product_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    return await review_service.get_product_reviews(db, product_id, page, page_size)


@router.get("/product/{product_id}/summary", response_model=ReviewSummary)
async def get_review_summary(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await review_service.get_review_summary(db, product_id)
