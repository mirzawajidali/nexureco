from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.core.dependencies import require_module
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.user import User, Address
from app.models.order import Order, OrderItem
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.user import AddressResponse
from app.utils.pagination import paginate
from app.core.security import hash_password
from datetime import datetime
from decimal import Decimal

router = APIRouter(prefix="/admin/customers", tags=["Admin Customers"])


# --- Schemas ---

class CustomerListItem(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: str | None
    is_active: bool
    created_at: datetime
    orders_count: int = 0
    total_spent: float = 0
    city: str | None = None
    country: str | None = None

    model_config = {"from_attributes": True}


class CustomerOrderSummary(BaseModel):
    id: int
    order_number: str
    status: str
    total: float
    created_at: datetime

    model_config = {"from_attributes": True}


class CustomerDetail(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: str | None
    is_active: bool
    email_verified: bool
    avatar_url: str | None
    created_at: datetime
    last_login_at: datetime | None
    orders_count: int = 0
    total_spent: float = 0
    average_order: float = 0
    last_order: CustomerOrderSummary | None = None
    addresses: list[AddressResponse] = []
    recent_orders: list[CustomerOrderSummary] = []
    admin_note: str | None = None

    model_config = {"from_attributes": True}


class AdminCustomerCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    phone: str | None = None
    note: str | None = None
    # Optional default address
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str = "Pakistan"


class AdminCustomerUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    email: str | None = Field(None, min_length=3, max_length=255)
    phone: str | None = None
    admin_note: str | None = None


class CustomerNoteUpdate(BaseModel):
    admin_note: str


# --- Helpers ---

async def _get_customer_stats(db: AsyncSession, user_id: int) -> dict:
    """Get order count, total spent, and average order for a customer."""
    result = await db.execute(
        select(
            func.count(Order.id).label("orders_count"),
            func.coalesce(func.sum(Order.total), 0).label("total_spent"),
        ).where(
            Order.user_id == user_id,
            Order.status.notin_(["cancelled", "returned"]),
        )
    )
    row = result.one()
    orders_count = row.orders_count or 0
    total_spent = float(row.total_spent or 0)
    average_order = total_spent / orders_count if orders_count > 0 else 0
    return {
        "orders_count": orders_count,
        "total_spent": total_spent,
        "average_order": average_order,
    }


async def _get_default_location(db: AsyncSession, user_id: int) -> dict:
    """Get the default address city/country for a customer."""
    result = await db.execute(
        select(Address)
        .where(Address.user_id == user_id)
        .order_by(Address.is_default.desc(), Address.created_at.desc())
        .limit(1)
    )
    addr = result.scalar_one_or_none()
    if addr:
        return {"city": addr.city, "country": addr.country}
    return {"city": None, "country": None}


# --- Endpoints ---

@router.get("/", response_model=PaginatedResponse[CustomerListItem])
async def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    sort: str = "newest",
    admin: User = require_module("customers"),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.role == "customer")
    if q:
        search = f"%{q}%"
        query = query.where(
            (User.first_name.ilike(search))
            | (User.last_name.ilike(search))
            | (User.email.ilike(search))
            | (User.phone.ilike(search))
        )

    sort_map = {
        "newest": User.created_at.desc(),
        "oldest": User.created_at.asc(),
        "name_asc": User.first_name.asc(),
        "name_desc": User.first_name.desc(),
    }
    query = query.order_by(sort_map.get(sort, User.created_at.desc()))

    result = await paginate(db, query, page=page, page_size=page_size)

    # Batch-load stats and locations for all customers (3 queries instead of 2N+1)
    users = result["items"]
    user_ids = [u.id for u in users]

    # Batch order stats
    stats_map = {}
    if user_ids:
        stats_result = await db.execute(
            select(
                Order.user_id,
                func.count(Order.id).label("orders_count"),
                func.coalesce(func.sum(Order.total), 0).label("total_spent"),
            )
            .where(Order.user_id.in_(user_ids), Order.status.notin_(["cancelled", "returned"]))
            .group_by(Order.user_id)
        )
        for row in stats_result.all():
            stats_map[row.user_id] = {
                "orders_count": row.orders_count or 0,
                "total_spent": float(row.total_spent or 0),
            }

    # Batch default locations (first address per user, sorted by is_default/created_at)
    location_map = {}
    if user_ids:
        addr_result = await db.execute(
            select(Address.user_id, Address.city, Address.country)
            .where(Address.user_id.in_(user_ids))
            .order_by(Address.user_id, Address.is_default.desc(), Address.created_at.desc())
        )
        for row in addr_result.all():
            if row.user_id not in location_map:
                location_map[row.user_id] = {"city": row.city, "country": row.country}

    enriched = []
    for user in users:
        stats = stats_map.get(user.id, {"orders_count": 0, "total_spent": 0})
        location = location_map.get(user.id, {"city": None, "country": None})
        enriched.append(CustomerListItem(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            phone=user.phone,
            is_active=user.is_active,
            created_at=user.created_at,
            orders_count=stats["orders_count"],
            total_spent=stats["total_spent"],
            city=location["city"],
            country=location["country"],
        ))
    result["items"] = enriched
    return result


@router.get("/{user_id}", response_model=CustomerDetail)
async def get_customer(
    user_id: int,
    admin: User = require_module("customers"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.addresses))
        .where(User.id == user_id, User.role == "customer")
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("Customer not found")

    # Order stats
    stats = await _get_customer_stats(db, user.id)

    # Recent orders (last 10)
    orders_result = await db.execute(
        select(Order)
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .limit(10)
    )
    orders = orders_result.scalars().all()
    recent_orders = [
        CustomerOrderSummary(
            id=o.id,
            order_number=o.order_number,
            status=o.status,
            total=float(o.total),
            created_at=o.created_at,
        )
        for o in orders
    ]
    last_order = recent_orders[0] if recent_orders else None

    addresses = [AddressResponse.model_validate(a) for a in user.addresses]

    return CustomerDetail(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        is_active=user.is_active,
        email_verified=user.email_verified,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        orders_count=stats["orders_count"],
        total_spent=stats["total_spent"],
        average_order=stats["average_order"],
        last_order=last_order,
        addresses=addresses,
        recent_orders=recent_orders,
        admin_note=user.admin_note if hasattr(user, "admin_note") else None,
    )


@router.post("/", response_model=CustomerDetail)
async def create_customer(
    data: AdminCustomerCreate,
    admin: User = require_module("customers"),
    db: AsyncSession = Depends(get_db),
):
    # Check email uniqueness
    existing = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise BadRequestException("A customer with this email already exists")

    # Create user with a random password (they can reset it)
    import secrets
    temp_password = secrets.token_urlsafe(16)

    user = User(
        email=data.email,
        password_hash=hash_password(temp_password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role="customer",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # Create address if provided
    if data.address_line1:
        addr = Address(
            user_id=user.id,
            first_name=data.first_name,
            last_name=data.last_name,
            phone=data.phone,
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            city=data.city or "",
            state=data.state or "",
            postal_code=data.postal_code or "",
            country=data.country,
            is_default=True,
        )
        db.add(addr)
        await db.flush()

    return await get_customer(user.id, admin, db)


@router.put("/{user_id}", response_model=CustomerDetail)
async def update_customer(
    user_id: int,
    data: AdminCustomerUpdate,
    admin: User = require_module("customers"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.role == "customer")
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("Customer not found")

    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.email is not None:
        # Check uniqueness
        existing = await db.execute(
            select(User).where(User.email == data.email, User.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise BadRequestException("Email already in use by another account")
        user.email = data.email
    if data.phone is not None:
        user.phone = data.phone

    await db.flush()
    return await get_customer(user_id, admin, db)


@router.put("/{user_id}/toggle-status", response_model=MessageResponse)
async def toggle_customer_status(
    user_id: int,
    admin: User = require_module("customers"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.role == "customer")
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("Customer not found")

    user.is_active = not user.is_active
    await db.flush()

    status = "activated" if user.is_active else "deactivated"
    return {"message": f"Customer {status} successfully"}
