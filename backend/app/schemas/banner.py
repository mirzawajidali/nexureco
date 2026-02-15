from pydantic import BaseModel, Field
from datetime import datetime


class BannerCreate(BaseModel):
    title: str | None = Field(None, max_length=200)
    subtitle: str | None = Field(None, max_length=300)
    image_url: str = Field(min_length=1, max_length=500)
    mobile_image_url: str | None = Field(None, max_length=500)
    link_url: str | None = Field(None, max_length=500)
    button_text: str | None = Field(None, max_length=100)
    position: str = "hero"
    display_order: int = 0
    is_active: bool = True
    starts_at: datetime | None = None
    expires_at: datetime | None = None


class BannerUpdate(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    image_url: str | None = None
    mobile_image_url: str | None = None
    link_url: str | None = None
    button_text: str | None = None
    position: str | None = None
    display_order: int | None = None
    is_active: bool | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None


class BannerOut(BaseModel):
    id: int
    title: str | None
    subtitle: str | None
    image_url: str
    mobile_image_url: str | None
    link_url: str | None
    button_text: str | None
    position: str
    display_order: int
    is_active: bool
    starts_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
