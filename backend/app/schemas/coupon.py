from pydantic import BaseModel, Field
from datetime import datetime


class CouponCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    description: str | None = Field(None, max_length=300)
    type: str = Field(description="percentage or fixed_amount")
    value: float = Field(gt=0)
    min_order_amount: float = 0
    max_discount: float | None = None
    usage_limit: int | None = None
    usage_per_customer: int = 1
    is_active: bool = True
    starts_at: datetime | None = None
    expires_at: datetime | None = None


class CouponUpdate(BaseModel):
    code: str | None = Field(None, min_length=1, max_length=50)
    description: str | None = None
    type: str | None = None
    value: float | None = Field(None, gt=0)
    min_order_amount: float | None = None
    max_discount: float | None = None
    usage_limit: int | None = None
    usage_per_customer: int | None = None
    is_active: bool | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None


class CouponOut(BaseModel):
    id: int
    code: str
    description: str | None
    type: str
    value: float
    min_order_amount: float
    max_discount: float | None
    usage_limit: int | None
    usage_per_customer: int
    used_count: int
    is_active: bool
    starts_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
