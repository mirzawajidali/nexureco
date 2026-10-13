from typing import Literal

from pydantic import BaseModel, Field, field_serializer, field_validator, model_validator
from datetime import datetime, timezone

from app.utils.store_time import STORE_TZ


def _to_utc(value: datetime | None) -> datetime | None:
    """Coupon start/end as stored: naive UTC. A time without a zone is the store's (Pakistan) time,
    so "31 Oct 23:59" from the admin means 23:59 in Pakistan, not 04:59 the next day."""
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=STORE_TZ)
    return value.astimezone(timezone.utc).replace(tzinfo=None)


class CouponCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    description: str | None = Field(None, max_length=300)
    type: Literal["percentage", "fixed_amount"]
    value: float = Field(gt=0)
    min_order_amount: float = Field(0, ge=0)
    max_discount: float | None = Field(None, ge=0)
    usage_limit: int | None = Field(None, ge=1)
    usage_per_customer: int = Field(1, ge=1)
    is_active: bool = True
    starts_at: datetime | None = None
    expires_at: datetime | None = None

    _utc = field_validator("starts_at", "expires_at")(_to_utc)

    @model_validator(mode="after")
    def _sensible(self) -> "CouponCreate":
        if self.type == "percentage" and self.value > 100:
            raise ValueError("A percentage discount can be at most 100%")
        if self.starts_at and self.expires_at and self.expires_at <= self.starts_at:
            raise ValueError("The end date must be after the start date")
        return self


class CouponUpdate(BaseModel):
    code: str | None = Field(None, min_length=1, max_length=50)
    description: str | None = None
    type: Literal["percentage", "fixed_amount"] | None = None
    value: float | None = Field(None, gt=0)
    min_order_amount: float | None = Field(None, ge=0)
    max_discount: float | None = Field(None, ge=0)
    usage_limit: int | None = Field(None, ge=1)
    usage_per_customer: int | None = Field(None, ge=1)
    is_active: bool | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None

    _utc = field_validator("starts_at", "expires_at")(_to_utc)


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

    @field_serializer("starts_at", "expires_at")
    def _as_utc(self, value: datetime | None) -> str | None:
        # Stored as naive UTC: say so, so the admin shows it in local time
        if value is None:
            return None
        return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).isoformat()
