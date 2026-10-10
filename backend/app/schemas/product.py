from pydantic import BaseModel, Field
from datetime import datetime


# --- Option & Variant Schemas ---

class OptionValueOut(BaseModel):
    id: int
    value: str
    display_order: int
    model_config = {"from_attributes": True}


class OptionOut(BaseModel):
    id: int
    name: str
    display_order: int
    values: list[OptionValueOut] = []
    model_config = {"from_attributes": True}


class VariantOptionValueOut(BaseModel):
    option_value_id: int
    model_config = {"from_attributes": True}


class _VariantBase(BaseModel):
    id: int
    sku: str | None
    price: float | None
    compare_at_price: float | None
    stock_quantity: int
    low_stock_threshold: int
    is_active: bool
    image_url: str | None
    option_values: list[VariantOptionValueOut] = []
    model_config = {"from_attributes": True}


class VariantOut(_VariantBase):
    """Admin view, including cost."""
    cost_price: float | None = None


class PublicVariantOut(_VariantBase):
    """Storefront view: no cost price."""


class ImageOut(BaseModel):
    id: int
    url: str
    alt_text: str | None
    display_order: int
    is_primary: bool
    model_config = {"from_attributes": True}


# --- Product Schemas ---

class _ProductListBase(BaseModel):
    id: int
    name: str
    slug: str
    short_description: str | None
    base_price: float
    compare_at_price: float | None
    sku: str | None = None
    status: str
    is_featured: bool
    avg_rating: float
    review_count: int
    primary_image: str | None = None
    category_name: str | None = None
    variant_count: int = 0
    variant_images: list[str] = []
    tags: list[str] | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class ProductListItem(_ProductListBase):
    """Admin view, including sales volume and stock."""
    total_sold: int
    total_stock: int = 0


class PublicProductListItem(_ProductListBase):
    """Storefront view: sales volume and stock levels stay private, so competitors can't track them."""
    in_stock: bool = True
    is_best_seller: bool = False
    # Colour name of each variant_images entry (None when the variant has no colour option)
    variant_colors: list[str | None] = []


class _ProductDetailBase(BaseModel):
    id: int
    category_id: int | None
    name: str
    slug: str
    description: str | None
    short_description: str | None
    base_price: float
    compare_at_price: float | None
    sku: str | None
    barcode: str | None = None
    weight: float | None = None
    requires_shipping: bool = True
    status: str
    is_featured: bool
    tags: list[str] | None
    meta_title: str | None
    meta_description: str | None
    size_and_fit: dict | None = None
    care_instructions: dict | None = None
    material_info: dict | None = None
    avg_rating: float
    review_count: int
    images: list[ImageOut] = []
    options: list[OptionOut] = []
    category_name: str | None = None
    category_slug: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ProductDetail(_ProductDetailBase):
    """Admin view, including cost and sales volume."""
    cost_price: float | None = None
    total_sold: int
    variants: list[VariantOut] = []


class PublicProductDetail(_ProductDetailBase):
    """Storefront view: no cost price or sales volume."""
    variants: list[PublicVariantOut] = []


# --- Admin Create/Update ---

class OptionValueCreate(BaseModel):
    value: str = Field(min_length=1, max_length=100)


class OptionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    values: list[OptionValueCreate]


class VariantCreate(BaseModel):
    sku: str | None = None
    price: float | None = None
    compare_at_price: float | None = None
    cost_price: float | None = None
    stock_quantity: int = 0
    low_stock_threshold: int = 5
    option_value_indices: list[int] = []  # indices into the flattened option_values list
    image_url: str | None = None


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    category_id: int | None = None
    description: str | None = None
    short_description: str | None = None
    base_price: float = Field(ge=0)
    compare_at_price: float | None = None
    cost_price: float | None = None
    sku: str | None = None
    barcode: str | None = None
    weight: float | None = None
    requires_shipping: bool = True
    status: str = "draft"
    is_featured: bool = False
    tags: list[str] | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    size_and_fit: dict | None = None
    care_instructions: dict | None = None
    material_info: dict | None = None
    options: list[OptionCreate] = []
    variants: list[VariantCreate] = []


class ProductUpdate(BaseModel):
    name: str | None = None
    category_id: int | None = None
    description: str | None = None
    short_description: str | None = None
    base_price: float | None = None
    compare_at_price: float | None = None
    cost_price: float | None = None
    sku: str | None = None
    barcode: str | None = None
    weight: float | None = None
    requires_shipping: bool | None = None
    status: str | None = None
    is_featured: bool | None = None
    tags: list[str] | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    size_and_fit: dict | None = None
    care_instructions: dict | None = None
    material_info: dict | None = None
    options: list[OptionCreate] | None = None
    variants: list[VariantCreate] | None = None
