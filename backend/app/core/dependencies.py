from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.models.user import User

security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise UnauthorizedException("Invalid or expired token")

    user_id = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException("Invalid token payload")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedException("User not found")
    if not user.is_active:
        raise UnauthorizedException("User account is disabled")

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "admin":
        raise ForbiddenException("Admin access required")
    return current_user


def require_module(module: str):
    """Dependency factory: allows admin (superadmin) or staff with the given module permission."""

    async def _check(
        credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        token = credentials.credentials
        payload = decode_token(token)
        if payload is None or payload.get("type") != "access":
            raise UnauthorizedException("Invalid or expired token")

        user_id = payload.get("sub")
        if user_id is None:
            raise UnauthorizedException("Invalid token payload")

        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()

        if user is None:
            raise UnauthorizedException("User not found")
        if not user.is_active:
            raise UnauthorizedException("User account is disabled")

        # Admin (superadmin) passes all checks
        if user.role == "admin":
            return user

        # Staff: check module permission from JWT, fallback to DB
        if user.role == "staff":
            permissions = payload.get("permissions")
            if permissions is None:
                # Fallback: load from DB
                from app.models.role import Role
                if user.role_id:
                    role_result = await db.execute(select(Role).where(Role.id == user.role_id))
                    role = role_result.scalar_one_or_none()
                    permissions = role.permissions if role and role.is_active else []
                else:
                    permissions = []

            if module in permissions:
                return user

            raise ForbiddenException(f"You don't have access to the {module} module")

        # Customer or any other role — no admin access
        raise ForbiddenException("Admin or staff access required")

    return Depends(_check)


async def get_optional_user(
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
) -> User | None:
    if credentials is None:
        return None
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    result = await db.execute(select(User).where(User.id == int(user_id)))
    return result.scalar_one_or_none()
