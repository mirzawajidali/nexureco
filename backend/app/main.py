from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.config import get_settings
from app.core.middleware import setup_middleware
from app.api.v1.router import api_router
from app.db.database import engine, Base, AsyncSessionLocal
from sqlalchemy import text, inspect
from app.services.menu_service import seed_default_menus
import os

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Add new columns to existing tables (safe: skips if column already exists)
    async with engine.begin() as conn:
        def _add_columns_if_missing(sync_conn):
            insp = inspect(sync_conn)

            # Products table migrations
            existing = {c["name"] for c in insp.get_columns("products")}
            new_cols = {
                "size_and_fit": "JSON NULL",
                "care_instructions": "JSON NULL",
                "material_info": "JSON NULL",
            }
            for col_name, col_def in new_cols.items():
                if col_name not in existing:
                    sync_conn.execute(text(f"ALTER TABLE products ADD COLUMN {col_name} {col_def}"))

            # Users table: add 'staff' to role enum and add role_id FK
            if insp.has_table("users"):
                user_cols = {c["name"] for c in insp.get_columns("users")}
                # Extend role enum to include 'staff'
                try:
                    sync_conn.execute(text(
                        "ALTER TABLE users MODIFY COLUMN role ENUM('customer','admin','staff') DEFAULT 'customer'"
                    ))
                except Exception:
                    pass  # Already updated or non-MySQL
                # Add role_id column
                if "role_id" not in user_cols:
                    sync_conn.execute(text(
                        "ALTER TABLE users ADD COLUMN role_id INT NULL"
                    ))
                    try:
                        sync_conn.execute(text(
                            "ALTER TABLE users ADD CONSTRAINT fk_users_role_id "
                            "FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL"
                        ))
                    except Exception:
                        pass  # FK may already exist

        await conn.run_sync(_add_columns_if_missing)

    # Seed default menus if none exist
    async with AsyncSessionLocal() as session:
        try:
            await seed_default_menus(session)
            await session.commit()
        except Exception:
            await session.rollback()

    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="My Brand - Fashion & Apparel Ecommerce Platform",
    lifespan=lifespan,
)

# Middleware
setup_middleware(app)

# Static files for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API Routes
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
