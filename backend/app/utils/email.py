import logging
import smtplib
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

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


def _render(template_name: str, context: dict) -> str:
    tpl = _env.get_template(template_name)
    return tpl.render(app_name=settings.APP_NAME, year=datetime.now().year, **context)


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
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Email sent to %s: %s", to, subject)
    except Exception:
        logger.exception("Failed to send email to %s: %s", to, subject)


def send_email_background(to: str, subject: str, template_name: str, context: dict) -> None:
    """Fire-and-forget email sending in a background thread. Never blocks the request."""
    html = _render(template_name, context)
    _pool.submit(_send_sync, to, subject, html)
