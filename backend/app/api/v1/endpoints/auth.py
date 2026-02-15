from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, RefreshTokenRequest,
    ForgotPasswordRequest, ResetPasswordRequest, UserResponse,
    VerifyEmailRequest, ResendOTPRequest,
)
from app.schemas.common import MessageResponse
from app.services import auth_service
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await auth_service.register_user(
        db=db,
        email=request.email,
        password=request.password,
        first_name=request.first_name,
        last_name=request.last_name,
        phone=request.phone,
    )
    tokens = await auth_service.create_tokens(db, user)
    return tokens


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await auth_service.authenticate_user(db, request.email, request.password)
    tokens = await auth_service.create_tokens(db, user)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    tokens = await auth_service.refresh_access_token(db, request.refresh_token)
    return tokens


@router.post("/logout", response_model=MessageResponse)
async def logout(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.revoke_refresh_token(db, request.refresh_token)
    return {"message": "Successfully logged out"}


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(request: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.verify_email_otp(db, request.email, request.otp_code)
    return {"message": "Email verified successfully"}


@router.post("/resend-otp", response_model=MessageResponse)
async def resend_otp(request: ResendOTPRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.resend_otp(db, request.email)
    return {"message": "If the email exists, a new verification code has been sent"}


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.create_password_reset_token(db, request.email)
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.reset_password(db, request.token, request.new_password)
    return {"message": "Password has been reset successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = {
        "id": current_user.id,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "email_verified": current_user.email_verified,
        "avatar_url": current_user.avatar_url,
        "created_at": current_user.created_at,
        "permissions": [],
    }
    if current_user.role == "staff" and current_user.role_id:
        from sqlalchemy import select
        from app.models.role import Role
        result = await db.execute(select(Role).where(Role.id == current_user.role_id))
        role = result.scalar_one_or_none()
        if role and role.is_active:
            data["permissions"] = role.permissions or []
    elif current_user.role == "admin":
        from app.models.role import ADMIN_MODULES
        data["permissions"] = list(ADMIN_MODULES)
    return data
