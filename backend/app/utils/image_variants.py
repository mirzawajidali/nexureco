"""Resized copies ("variants") of uploaded images, generated on first request.

A variant of ``uploads/<path>`` at width W lives at ``uploads/resized/<W>/<path>``
and is served from ``/uploads/resized/<W>/<path>`` (see app/api/uploads.py).
"""
import os
import uuid
from pathlib import Path

from PIL import Image, ImageOps
from app.config import get_settings

settings = get_settings()

VARIANTS_DIR = "resized"

# Must match IMAGE_WIDTHS in frontend/src/utils/image.ts and the hero preload in frontend/index.html
ALLOWED_WIDTHS = frozenset({160, 320, 480, 640, 960, 1280, 1600, 1920})

# extension -> (Pillow format, save options, mime type)
FORMATS: dict[str, tuple[str, dict, str]] = {
    ".avif": ("AVIF", {"quality": 50, "speed": 8}, "image/avif"),
    ".webp": ("WEBP", {"quality": 80, "method": 4}, "image/webp"),
    ".jpg": ("JPEG", {"quality": 82, "optimize": True, "progressive": True}, "image/jpeg"),
    ".jpeg": ("JPEG", {"quality": 82, "optimize": True, "progressive": True}, "image/jpeg"),
    ".png": ("PNG", {"optimize": True}, "image/png"),
}


def upload_root() -> Path:
    return Path(settings.UPLOAD_DIR).resolve()


def variant_path(relative: Path, width: int) -> Path:
    return upload_root() / VARIANTS_DIR / str(width) / relative


def create_variant(source: Path, target: Path, width: int) -> Path:
    """Write ``source`` scaled down to ``width`` px wide at ``target``; return the file to serve.

    Images already narrower than ``width`` are never upscaled — the original is returned instead.
    """
    pil_format, save_options, _ = FORMATS[source.suffix.lower()]

    with Image.open(source) as img:
        if img.width <= width:
            return source

        resized = ImageOps.exif_transpose(img)
        if resized.mode == "P":
            resized = resized.convert("RGBA")
        if pil_format == "JPEG" and resized.mode != "RGB":
            resized = resized.convert("RGB")
        height = max(1, round(resized.height * width / resized.width))
        resized = resized.resize((width, height), Image.LANCZOS)

        # Write to a temp file and rename so concurrent requests never serve a half-written image
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_name(f".{target.name}.{uuid.uuid4().hex}.tmp")
        try:
            resized.save(tmp, format=pil_format, **save_options)
            os.replace(tmp, target)
        finally:
            tmp.unlink(missing_ok=True)

    return target


def delete_variants(url: str) -> None:
    """Remove every resized copy of an uploaded file (given its /uploads/... URL)."""
    relative = Path(url.removeprefix("/uploads/"))
    for width in ALLOWED_WIDTHS:
        variant_path(relative, width).unlink(missing_ok=True)
