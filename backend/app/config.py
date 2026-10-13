from pydantic import model_validator
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "mysql+aiomysql://root:password@localhost:3306/mybrand_db"

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "Nexure CO"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@mybrand.com"

    # Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 5242880  # 5MB

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100

    # Trusted Hosts
    TRUSTED_HOSTS: str = "*"

    # Site URL (used for sitemaps, emails, etc.)
    SITE_URL: str = "http://localhost:5173"

    # The built storefront index.html, which storefront pages are rendered into (see app/api/storefront.py).
    # Served by the frontend container on an internal-only port (frontend/nginx/shell.conf).
    SPA_SHELL_URL: str = "http://frontend:8080/index.html"

    # PayFast (Pakistan) online payments: offered at checkout only once the merchant ID and secured key
    # are set. The base URL defaults to PayFast's UAT (test) system; use the production URL PayFast gives you.
    PAYFAST_MERCHANT_ID: str = ""
    PAYFAST_SECURED_KEY: str = ""
    PAYFAST_MERCHANT_NAME: str = "Nexure CO"
    PAYFAST_BASE_URL: str = "https://ipguat.apps.net.pk"

    @property
    def payfast_enabled(self) -> bool:
        return bool(self.PAYFAST_MERCHANT_ID and self.PAYFAST_SECURED_KEY)

    # Elasticsearch
    ELASTICSEARCH_URL: str = "http://localhost:9200"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def trusted_hosts_list(self) -> list[str]:
        return [host.strip() for host in self.TRUSTED_HOSTS.split(",")]

    @model_validator(mode="after")
    def _require_real_secret_key(self) -> "Settings":
        # Every login token is signed with SECRET_KEY: with the public default (or an empty/short key)
        # anyone could sign their own admin token. Outside DEBUG, refuse to start instead.
        if not self.DEBUG and (self.SECRET_KEY.startswith("your-super-secret") or len(self.SECRET_KEY) < 32):
            raise ValueError("SECRET_KEY must be set to a long random value (32+ characters) in production")
        return self

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
