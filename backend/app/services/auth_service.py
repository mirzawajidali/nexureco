import random
from datetime import datetime, timedelta, timezone
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.user import User, RefreshToken, PasswordResetToken, EmailOTP
from app.models.role import Role
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token,
)
from app.core.exceptions import (
    BadRequestException, UnauthorizedException, ConflictException, NotFoundException,
)
from app.config import get_settings
from app.utils.email import send_email_background

settings = get_settings()


def _generate_otp() -> str:
    return "".join([str(random.randint(0, 9)) for _ in range(6)])


async def _create_and_send_otp(db: AsyncSession, user: User) -> None:
    """Generate a 6-digit OTP, store it, and email it."""
    otp_code = _generate_otp()
    otp = EmailOTP(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(otp)
    await db.flush()

    send_email_background(
        to=user.email,
        subject=f"Your Verification Code — {settings.APP_NAME}",
        template_name="verify_otp.html",
        context={"first_name": user.first_name, "otp_code": otp_code},
    )


async def register_user(
    db: AsyncSession,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    phone: str | None = None,
) -> User:
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise ConflictException("Email already registered")

    user = User(
        email=email,
        password_hash=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        phone=phone,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Send welcome email
    send_email_background(
        to=user.email,
        subject=f"Welcome to {settings.APP_NAME}",
        template_name="welcome.html",
        context={"first_name": user.first_name, "email": user.email},
    )

    # Send OTP verification email
    await _create_and_send_otp(db, user)

    return user


async def verify_email_otp(db: AsyncSession, email: str, otp_code: str) -> None:
    """Verify a user's email using their OTP code."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise BadRequestException("Invalid email or OTP")

    if user.email_verified:
        raise BadRequestException("Email already verified")

    # Find a valid unused OTP
    result = await db.execute(
        select(EmailOTP)
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.otp_code == otp_code,
            EmailOTP.used_at.is_(None),
        )
        .order_by(EmailOTP.created_at.desc())
    )
    otp = result.scalar_one_or_none()
    if not otp:
        raise BadRequestException("Invalid email or OTP")

    if otp.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise BadRequestException("OTP has expired. Please request a new one.")

    otp.used_at = datetime.now(timezone.utc)
    user.email_verified = True
    await db.flush()


async def resend_otp(db: AsyncSession, email: str) -> None:
    """Generate and send a new OTP for the user."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        return  # Don't reveal if email exists

    if user.email_verified:
        raise BadRequestException("Email already verified")

    await _create_and_send_otp(db, user)


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise UnauthorizedException("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedException("Account is disabled")

    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()
    return user


async def create_tokens(db: AsyncSession, user: User) -> dict:
    token_data = {"sub": str(user.id), "role": user.role}

    # Embed permissions in JWT for staff users
    if user.role == "staff" and user.role_id:
        result = await db.execute(select(Role).where(Role.id == user.role_id))
        role = result.scalar_one_or_none()
        if role and role.is_active:
            token_data["permissions"] = role.permissions or []
        else:
            token_data["permissions"] = []

    access_token = create_access_token(data=token_data)
    refresh_token_str = create_refresh_token(data={"sub": str(user.id)})

    refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token)
    await db.flush()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer",
    }


async def refresh_access_token(db: AsyncSession, refresh_token_str: str) -> dict:
    payload = decode_token(refresh_token_str)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedException("Invalid refresh token")

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == refresh_token_str,
            RefreshToken.revoked_at.is_(None),
        )
    )
    stored_token = result.scalar_one_or_none()
    if not stored_token:
        raise UnauthorizedException("Refresh token not found or revoked")

    if stored_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise UnauthorizedException("Refresh token expired")

    # Revoke old token
    stored_token.revoked_at = datetime.now(timezone.utc)

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or disabled")

    return await create_tokens(db, user)


async def revoke_refresh_token(db: AsyncSession, refresh_token_str: str) -> None:
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == refresh_token_str)
    )
    stored_token = result.scalar_one_or_none()
    if stored_token:
        stored_token.revoked_at = datetime.now(timezone.utc)
        await db.flush()


async def create_password_reset_token(db: AsyncSession, email: str) -> str | None:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        return None  # Don't reveal if email exists

    token = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(reset_token)
    await db.flush()

    # Send password reset email
    send_email_background(
        to=user.email,
        subject=f"Reset Your Password — {settings.APP_NAME}",
        template_name="password_reset.html",
        context={"first_name": user.first_name, "reset_token": token},
    )

    return token


async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == token,
            PasswordResetToken.used_at.is_(None),
        )
    )
    reset_token = result.scalar_one_or_none()
    if not reset_token:
        raise BadRequestException("Invalid or expired reset token")

    if reset_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise BadRequestException("Reset token has expired")

    result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    user.password_hash = hash_password(new_password)
    reset_token.used_at = datetime.now(timezone.utc)
    await db.flush()
