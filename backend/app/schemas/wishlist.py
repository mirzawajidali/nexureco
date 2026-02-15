from pydantic import BaseModel
from datetime import datetime


class WishlistAdd(BaseModel):
    product_id: int


class WishlistItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_slug: str
    product_price: float
    compare_at_price: float | None
    primary_image: str | None
    created_at: datetime
