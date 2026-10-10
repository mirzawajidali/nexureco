from fastapi import APIRouter, Depends, File, Header, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.review import ReviewCreate, ReviewOut, ReviewSummary, VerifiedReviewCreate
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


@router.post("/verified", response_model=ReviewOut, status_code=201)
async def create_verified_review(
    data: VerifiedReviewCreate,
    db: AsyncSession = Depends(get_db),
):
    """Review without an account: the order number and its email or phone prove the purchase."""
    return await review_service.create_verified_review(db, data)


@router.post("/{review_id}/images", status_code=201)
async def add_review_photo(
    review_id: int,
    file: UploadFile = File(...),
    x_review_token: str = Header(..., description="photo_upload_token from creating the review"),
    db: AsyncSession = Depends(get_db),
):
    """Add one customer photo (JPEG, PNG, WebP or AVIF, up to 5 MB; 3 per review)."""
    return await review_service.add_review_photo(db, review_id, x_review_token, file)


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
