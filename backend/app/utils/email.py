import logging
import random
import smtplib
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Template engine
_template_dir = Path(__file__).resolve().parent.parent / "templates" / "emails"
_env = Environment(
    loader=FileSystemLoader(str(_template_dir)),
    autoescape=True,
)

# Thread pool for background email sending — separate from the async event loop
_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="email")

_TAGLINES = [
    "Wear the Future",
    "Style Without Limits",
    "Redefine Your Edge",
    "Born to Stand Out",
    "Where Style Meets Street",
]


async def _fetch_recommended_products(limit: int = 4) -> list[dict]:
    """Fetch random active products for 'You May Also Like' section."""
    from app.db.database import AsyncSessionLocal
    from app.models.product import Product, ProductImage

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Product)
                .options(selectinload(Product.images))
                .where(Product.status == "active")
                .order_by(func.rand())
                .limit(limit)
            )
            products = result.scalars().all()

            items = []
            for p in products:
                primary_img = next((img.url for img in p.images if img.is_primary), None)
                if not primary_img and p.images:
                    primary_img = p.images[0].url
                items.append({
                    "name": p.name,
                    "price": f"Rs. {p.base_price:,.0f}",
                    "compare_at_price": f"Rs. {p.compare_at_price:,.0f}" if p.compare_at_price else None,
                    "image_url": primary_img or "",
                    "product_url": f"{settings.SITE_URL}/product/{p.slug}",
                })
            return items
    except Exception:
        logger.exception("Failed to fetch recommended products for email")
        return []


def _render(template_name: str, context: dict, recommended_products: list[dict] | None = None) -> str:
    tpl = _env.get_template(template_name)
    logo_url = "https://nexureco.com/assets/logo-rD11QX8g.png"
    tagline = random.choice(_TAGLINES)
    return tpl.render(
        app_name=settings.APP_NAME,
        year=datetime.now().year,
        logo_url=logo_url,
        tagline=tagline,
        recommended_products=recommended_products or [],
        site_url=settings.SITE_URL,
        **context,
    )


def _send_sync(to: str, subject: str, html_body: str) -> None:
    """Send email synchronously — runs in thread pool, never blocks the event loop."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — skipping email to %s: %s", to, subject)
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.APP_NAME} <{settings.EMAIL_FROM}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        if settings.SMTP_PORT == 465:
            server_cls = smtplib.SMTP_SSL
        else:
            server_cls = smtplib.SMTP
        with server_cls(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_PORT != 465:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Email sent to %s: %s", to, subject)
    except Exception:
        logger.exception("Failed to send email to %s: %s", to, subject)


async def send_email_background(to: str, subject: str, template_name: str, context: dict) -> None:
    """Fetch recommended products (async), render, then send in background thread."""
    recommended = await _fetch_recommended_products(4)
    html = _render(template_name, context, recommended_products=recommended)
    _pool.submit(_send_sync, to, subject, html)
