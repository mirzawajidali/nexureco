import random
from datetime import datetime, timedelta, timezone
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.models.user import User, RefreshToken, PasswordResetToken, EmailOTP
from app.models.role import Role
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token,
)
from app.core.exceptions import (
    BadRequestException, UnauthorizedException, ConflictException, NotFoundException,
    TooManyRequestsException,
)
from app.config import get_settings
from app.db.redis import CacheService, get_redis
from starlette.concurrency import run_in_threadpool
from app.utils.email import send_email_background
from app.services import coupon_service

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

    await send_email_background(
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

    # Send welcome email, with the sign-up coupon while it's active
    welcome_offer = await coupon_service.get_welcome_offer(db)
    await send_email_background(
        to=user.email,
        subject=(
            f"Welcome to {settings.APP_NAME}: {welcome_offer['headline']}"
            if welcome_offer else f"Welcome to {settings.APP_NAME}"
        ),
        template_name="welcome.html",
        context={"first_name": user.first_name, "email": user.email, "offer": welcome_offer},
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


# Too many wrong passwords for one email lock it for a while: counted in Redis, so the count is shared by
# every server worker and every IP (the per-IP rate limits alone can be spread across many addresses).
# Without Redis there's no lockout; the rate limits still apply.
LOGIN_MAX_FAILURES = 8
LOGIN_LOCK_SECONDS = 15 * 60
# Checked when the email has no account, so a wrong email takes as long as a wrong password
_UNKNOWN_USER_HASH = hash_password(secrets.token_urlsafe(16))


def _login_failures_key(email: str) -> str:
    return f"{CacheService.PREFIX}:login-failures:{email.strip().lower()}"


async def clear_login_failures(email: str) -> None:
    redis = get_redis()
    if redis:
        try:
            await redis.delete(_login_failures_key(email))
        except Exception:
            pass


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User:
    redis = get_redis()
    key = _login_failures_key(email)
    if redis:
        try:
            locked = int(await redis.get(key) or 0) >= LOGIN_MAX_FAILURES
        except Exception:
            locked = False
        if locked:
            raise TooManyRequestsException(
                "Too many failed sign-in attempts. Try again in 15 minutes, or reset your password."
            )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # bcrypt takes ~0.25 s of CPU: run it off the event loop so sign-ins don't stall other requests
    valid = await run_in_threadpool(verify_password, password, user.password_hash if user else _UNKNOWN_USER_HASH)
    if not user or not valid:
        if redis:
            try:
                failures = await redis.incr(key)
                if failures == 1:
                    await redis.expire(key, LOGIN_LOCK_SECONDS)
            except Exception:
                pass
        raise UnauthorizedException("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedException("Account is disabled")

    await clear_login_failures(email)
    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()
    return user


# A sign-in lasts at most this long: refreshing the access token keeps it going until then, but not beyond
# (otherwise a stolen refresh token could be kept alive forever by refreshing it weekly)
SESSION_MAX_AGE = timedelta(days=30)


async def revoke_all_sessions(db: AsyncSession, user_id: int) -> None:
    """Sign the account out everywhere: every refresh token stops working (access tokens lapse within minutes)."""
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )


async def create_tokens(db: AsyncSession, user: User, auth_time: int | None = None) -> dict:
    """Access + refresh token. ``auth_time`` is when the user signed in (kept across refreshes)."""
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
    refresh_token_str = create_refresh_token(data={
        "sub": str(user.id),
        "auth_time": auth_time or int(datetime.now(timezone.utc).timestamp()),
    })

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

    now = datetime.now(timezone.utc)
    if stored_token.expires_at.replace(tzinfo=timezone.utc) < now:
        raise UnauthorizedException("Refresh token expired")

    # Sessions from before auth_time existed count from now
    auth_time = int(payload.get("auth_time") or now.timestamp())
    if now - datetime.fromtimestamp(auth_time, timezone.utc) > SESSION_MAX_AGE:
        raise UnauthorizedException("Your session has expired. Please sign in again.")

    # Revoke old token
    stored_token.revoked_at = now

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or disabled")

    return await create_tokens(db, user, auth_time=auth_time)


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
    await send_email_background(
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
    # A reset often follows a lost or stolen password: end every existing session, and lift a lockout
    await revoke_all_sessions(db, user.id)
    await clear_login_failures(user.email)
    await db.flush()
