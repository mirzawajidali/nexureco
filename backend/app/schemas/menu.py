from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime


# ── Menu ──

class MenuCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    handle: str = Field(min_length=1, max_length=50, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    is_active: bool = True


class MenuUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    is_active: bool | None = None


class MenuOut(BaseModel):
    id: int
    name: str
    handle: str
    is_active: bool
    item_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Menu Item ──

class MenuItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    url: str = Field(min_length=1, max_length=500)
    parent_id: int | None = None
    link_type: str = "custom"
    open_in_new_tab: bool = False
    display_order: int = 0
    is_active: bool = True


class MenuItemUpdate(BaseModel):
    title: str | None = Field(None, max_length=100)
    url: str | None = Field(None, max_length=500)
    parent_id: int | None = None
    link_type: str | None = None
    open_in_new_tab: bool | None = None
    display_order: int | None = None
    is_active: bool | None = None


class MenuItemOut(BaseModel):
    id: int
    menu_id: int
    parent_id: int | None
    title: str
    url: str
    link_type: str
    open_in_new_tab: bool
    display_order: int
    is_active: bool
    children: list[MenuItemOut] = []

    model_config = {"from_attributes": True}


class MenuDetailOut(BaseModel):
    id: int
    name: str
    handle: str
    is_active: bool
    items: list[MenuItemOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReorderItem(BaseModel):
    id: int
    display_order: int


class ReorderRequest(BaseModel):
    items: list[ReorderItem]
