from pydantic import BaseModel, Field
from datetime import datetime


class ReviewCreate(BaseModel):
    product_id: int
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(None, max_length=200)
    comment: str | None = None


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
    helpful_count: int
    images: list[ReviewImageOut] = []
    created_at: datetime


class ReviewSummary(BaseModel):
    avg_rating: float
    total_reviews: int
    rating_breakdown: dict[str, int]
