import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.role import Role, ADMIN_MODULES
from app.models.user import User
from app.schemas.role import RoleCreate, RoleUpdate
from app.core.exceptions import BadRequestException, NotFoundException, ConflictException


def _slugify(name: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", name.lower().strip())
    return re.sub(r"[-\s]+", "-", slug)


async def create_role(db: AsyncSession, data: RoleCreate) -> Role:
    # Validate permissions
    invalid = set(data.permissions) - set(ADMIN_MODULES)
    if invalid:
        raise BadRequestException(f"Invalid modules: {', '.join(invalid)}")

    slug = _slugify(data.name)
    result = await db.execute(select(Role).where((Role.name == data.name) | (Role.slug == slug)))
    if result.scalar_one_or_none():
        raise ConflictException("A role with this name already exists")

    role = Role(
        name=data.name,
        slug=slug,
        description=data.description,
        permissions=data.permissions,
    )
    db.add(role)
    await db.flush()
    await db.refresh(role)
    return role


async def get_roles(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Role).order_by(Role.name))
    roles = result.scalars().all()

    output = []
    for role in roles:
        count_result = await db.execute(
            select(func.count(User.id)).where(User.role_id == role.id)
        )
        staff_count = count_result.scalar() or 0
        output.append({
            "id": role.id,
            "name": role.name,
            "slug": role.slug,
            "description": role.description,
            "permissions": role.permissions or [],
            "is_active": role.is_active,
            "staff_count": staff_count,
            "created_at": role.created_at,
        })
    return output


async def get_role(db: AsyncSession, role_id: int) -> Role:
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise NotFoundException("Role not found")
    return role


async def update_role(db: AsyncSession, role_id: int, data: RoleUpdate) -> Role:
    role = await get_role(db, role_id)

    if data.permissions is not None:
        invalid = set(data.permissions) - set(ADMIN_MODULES)
        if invalid:
            raise BadRequestException(f"Invalid modules: {', '.join(invalid)}")
        role.permissions = data.permissions

    if data.name is not None:
        slug = _slugify(data.name)
        existing = await db.execute(
            select(Role).where(Role.slug == slug, Role.id != role_id)
        )
        if existing.scalar_one_or_none():
            raise ConflictException("A role with this name already exists")
        role.name = data.name
        role.slug = slug

    if data.description is not None:
        role.description = data.description
    if data.is_active is not None:
        role.is_active = data.is_active

    await db.flush()
    await db.refresh(role)
    return role


async def delete_role(db: AsyncSession, role_id: int) -> None:
    role = await get_role(db, role_id)
    # Check if any staff use this role
    count_result = await db.execute(
        select(func.count(User.id)).where(User.role_id == role_id)
    )
    if count_result.scalar() > 0:
        raise BadRequestException("Cannot delete role that is assigned to staff members")
    await db.delete(role)
    await db.flush()
