import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.config import get_settings
from app.core.middleware import setup_middleware
from app.api.v1.router import api_router
from app.api.v1.endpoints.sitemaps import router as seo_router
from app.db.database import engine, Base, AsyncSessionLocal
from app.db.redis import init_redis, close_redis
from app.db.elasticsearch import init_elasticsearch, close_elasticsearch
from app.services.es_index_service import PRODUCTS_INDEX, PRODUCTS_SETTINGS
from app.services.es_indexing_service import bulk_index_all_products
from sqlalchemy import text, inspect
from app.services.menu_service import seed_default_menus
import os

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning(f"DDL create_all skipped (concurrent worker): {e}")

    # Add new columns to existing tables (safe: skips if column already exists)
    try:
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
    except Exception as e:
        logger.warning(f"DDL migrations skipped (concurrent worker): {e}")

    # Seed default menus if none exist
    async with AsyncSessionLocal() as session:
        try:
            await seed_default_menus(session)
            await session.commit()
        except Exception:
            await session.rollback()

    # Initialize Redis
    await init_redis()

    # Initialize Elasticsearch and ensure index exists
    es = await init_elasticsearch()
    if es:
        try:
            exists = await es.indices.exists(index=PRODUCTS_INDEX)
            if not exists:
                try:
                    await es.indices.create(index=PRODUCTS_INDEX, body=PRODUCTS_SETTINGS)
                    logger.info(f"Created ES index '{PRODUCTS_INDEX}'")
                except Exception:
                    pass  # Race condition: another worker created it first
            # Bulk index if index is empty or nearly empty
            count_resp = await es.count(index=PRODUCTS_INDEX)
            doc_count = count_resp.get("count", 0) if isinstance(count_resp, dict) else count_resp.body.get("count", 0)
            if doc_count < 5:
                async with AsyncSessionLocal() as session:
                    count = await bulk_index_all_products(session)
                    logger.info(f"ES bulk index: {count} products indexed")
        except Exception as e:
            logger.warning(f"ES index setup failed: {e}")

    yield
    # Shutdown
    await close_redis()
    await close_elasticsearch()
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

# SEO Routes (sitemap.xml, robots.txt at root level)
app.include_router(seo_router)


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
