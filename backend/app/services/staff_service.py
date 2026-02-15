from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.role import Role
from app.schemas.staff import StaffCreate, StaffUpdate
from app.core.security import hash_password
from app.core.exceptions import BadRequestException, NotFoundException, ConflictException
from app.utils.pagination import paginate


async def create_staff(db: AsyncSession, data: StaffCreate) -> dict:
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise ConflictException("Email already registered")

    # Verify role exists
    role_result = await db.execute(select(Role).where(Role.id == data.role_id, Role.is_active == True))
    role = role_result.scalar_one_or_none()
    if not role:
        raise BadRequestException("Invalid or inactive role")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role="staff",
        role_id=data.role_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    return _staff_dict(user, role)


async def get_staff_list(db: AsyncSession, page: int = 1, page_size: int = 20) -> dict:
    query = (
        select(User)
        .options(selectinload(User.staff_role))
        .where(User.role == "staff")
        .order_by(User.created_at.desc())
    )
    result = await paginate(db, query, page, page_size)

    result["items"] = [_staff_dict(user, user.staff_role) for user in result["items"]]
    return result


async def get_staff(db: AsyncSession, user_id: int) -> dict:
    result = await db.execute(
        select(User).options(selectinload(User.staff_role)).where(User.id == user_id, User.role == "staff")
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("Staff member not found")
    return _staff_dict(user, user.staff_role)


async def update_staff(db: AsyncSession, user_id: int, data: StaffUpdate) -> dict:
    result = await db.execute(
        select(User).options(selectinload(User.staff_role)).where(User.id == user_id, User.role == "staff")
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("Staff member not found")

    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.phone is not None:
        user.phone = data.phone
    if data.is_active is not None:
        user.is_active = data.is_active

    if data.role_id is not None:
        role_result = await db.execute(select(Role).where(Role.id == data.role_id, Role.is_active == True))
        role = role_result.scalar_one_or_none()
        if not role:
            raise BadRequestException("Invalid or inactive role")
        user.role_id = data.role_id

    await db.flush()

    # Reload with relationship
    result = await db.execute(
        select(User).options(selectinload(User.staff_role)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    return _staff_dict(user, user.staff_role)


async def delete_staff(db: AsyncSession, user_id: int) -> None:
    result = await db.execute(select(User).where(User.id == user_id, User.role == "staff"))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("Staff member not found")
    await db.delete(user)
    await db.flush()


def _staff_dict(user: User, role: Role | None) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "role": user.role,
        "role_id": user.role_id,
        "role_name": role.name if role else None,
        "permissions": role.permissions if role else [],
        "is_active": user.is_active,
        "created_at": user.created_at,
        "last_login_at": user.last_login_at,
    }
