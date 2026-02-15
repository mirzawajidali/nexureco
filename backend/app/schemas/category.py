from pydantic import BaseModel, Field
from datetime import datetime


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    parent_id: int | None = None
    description: str | None = None
    image_url: str | None = None
    display_order: int = 0
    is_active: bool = True
    meta_title: str | None = None
    meta_description: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    description: str | None = None
    image_url: str | None = None
    display_order: int | None = None
    is_active: bool | None = None
    meta_title: str | None = None
    meta_description: str | None = None


class CategoryOut(BaseModel):
    id: int
    parent_id: int | None
    name: str
    slug: str
    description: str | None
    image_url: str | None
    display_order: int
    is_active: bool
    meta_title: str | None
    meta_description: str | None
    children: list["CategoryOut"] = []
    product_count: int = 0
    created_at: datetime
    model_config = {"from_attributes": True}
