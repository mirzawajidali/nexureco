from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


class TrackOrderRequest(BaseModel):
    order_number: str = Field(min_length=1, max_length=30)
    email: EmailStr


class CheckoutItem(BaseModel):
    product_id: int
    variant_id: int | None = None
    quantity: int = Field(ge=1)


class CheckoutRequest(BaseModel):
    guest_email: EmailStr | None = None
    items: list[CheckoutItem] = Field(min_length=1)
    shipping_first_name: str = Field(min_length=1, max_length=100)
    shipping_last_name: str = Field(min_length=1, max_length=100)
    shipping_phone: str = Field(min_length=1, max_length=20)
    shipping_address1: str = Field(min_length=1, max_length=255)
    shipping_address2: str | None = None
    shipping_city: str = Field(min_length=1, max_length=100)
    shipping_state: str = Field(min_length=1, max_length=100)
    shipping_postal_code: str = Field(min_length=1, max_length=20)
    shipping_country: str = "Pakistan"
    customer_note: str | None = None
    coupon_code: str | None = None


class OrderItemOut(BaseModel):
    id: int
    product_id: int | None = None
    product_name: str
    variant_info: str | None
    sku: str | None
    quantity: int
    unit_price: float
    total_price: float
    image_url: str | None
    model_config = {"from_attributes": True}


class OrderStatusHistoryOut(BaseModel):
    id: int
    status: str
    note: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class TrackOrderOut(BaseModel):
    order_number: str
    status: str
    payment_method: str
    payment_status: str
    subtotal: float
    shipping_cost: float
    discount_amount: float
    total: float
    shipping_city: str | None
    shipping_state: str | None
    tracking_number: str | None
    tracking_url: str | None
    items: list[OrderItemOut] = []
    status_history: list[OrderStatusHistoryOut] = []
    created_at: datetime
    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    user_id: int | None = None
    order_number: str
    status: str
    payment_method: str
    payment_status: str
    subtotal: float
    shipping_cost: float
    discount_amount: float
    tax_amount: float
    total: float
    coupon_code: str | None
    shipping_first_name: str | None
    shipping_last_name: str | None
    shipping_phone: str | None
    shipping_address1: str | None
    shipping_address2: str | None
    shipping_city: str | None
    shipping_state: str | None
    shipping_postal_code: str | None
    shipping_country: str | None
    tracking_number: str | None
    tracking_url: str | None
    customer_note: str | None
    admin_note: str | None = None
    items: list[OrderItemOut] = []
    status_history: list[OrderStatusHistoryOut] = []
    created_at: datetime
    model_config = {"from_attributes": True}


class OrderListItem(BaseModel):
    id: int
    order_number: str
    status: str
    payment_status: str = "pending"
    total: float
    item_count: int = 0
    customer_name: str | None = None
    delivery_method: str = "Standard"
    created_at: datetime
    model_config = {"from_attributes": True}
