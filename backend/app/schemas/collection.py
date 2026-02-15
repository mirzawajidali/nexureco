from pydantic import BaseModel, Field
from datetime import datetime


class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    image_url: str | None = None
    type: str = "manual"
    is_featured: bool = False
    is_active: bool = True
    display_order: int = 0
    meta_title: str | None = None
    meta_description: str | None = None


class CollectionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    type: str | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    display_order: int | None = None
    meta_title: str | None = None
    meta_description: str | None = None


class CollectionOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    image_url: str | None
    type: str
    is_featured: bool
    is_active: bool
    display_order: int
    product_count: int = 0
    created_at: datetime
    model_config = {"from_attributes": True}


class CollectionProductItem(BaseModel):
    id: int
    name: str
    slug: str
    image_url: str | None = None
    base_price: float
    status: str
    model_config = {"from_attributes": True}


class CollectionDetailOut(CollectionOut):
    meta_title: str | None = None
    meta_description: str | None = None
    products: list[CollectionProductItem] = []
