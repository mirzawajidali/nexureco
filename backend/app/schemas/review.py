from pydantic import BaseModel, Field
from datetime import datetime


class ReviewCreate(BaseModel):
    product_id: int
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(None, max_length=200)
    comment: str | None = None


class VerifiedReviewCreate(BaseModel):
    """A review without an account: the order number plus the email or phone it was placed with."""
    product_id: int
    order_number: str = Field(min_length=3, max_length=30)
    contact: str = Field(min_length=5, max_length=255, description="Email or phone number used for the order")
    name: str | None = Field(None, max_length=60)
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(None, max_length=200)
    comment: str | None = Field(None, max_length=2000)


class ReviewImageOut(BaseModel):
    id: int
    url: str
    model_config = {"from_attributes": True}


class ReviewOut(BaseModel):
    id: int
    product_id: int
    user_name: str
    rating: int
    title: str | None
    comment: str | None
    is_approved: bool
    is_verified: bool = False
    helpful_count: int
    images: list[ReviewImageOut] = []
    created_at: datetime


class ReviewSummary(BaseModel):
    avg_rating: float
    total_reviews: int
    rating_breakdown: dict[str, int]
