from pydantic import BaseModel, Field
from datetime import datetime


class CartItemAdd(BaseModel):
    product_id: int
    variant_id: int | None = None
    quantity: int = Field(ge=1, default=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartItemOut(BaseModel):
    id: int
    product_id: int
    variant_id: int | None
    quantity: int
    product_name: str
    product_slug: str
    product_image: str | None
    variant_info: str | None
    unit_price: float
    total_price: float
    stock_available: int | None = None
    model_config = {"from_attributes": True}


class CartOut(BaseModel):
    items: list[CartItemOut]
    subtotal: float
    item_count: int
    coupon_code: str | None = None
    discount_amount: float = 0


class ApplyCouponRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50)
