"""Resized copies ("variants") of uploaded images, generated on first request.

A variant of ``uploads/<path>`` at width W lives at ``uploads/resized/<W>/<path>``
and is served from ``/uploads/resized/<W>/<path>`` (see app/api/uploads.py).

JPEG copies for clients that can't read AVIF/WebP (link previews, shopping feeds) live at
``uploads/jpeg/<preset>/<path>.jpg`` and are served from the same URL path.
"""
import os
import shutil
import uuid
from pathlib import Path

from PIL import Image, ImageOps, ImageStat
from app.config import get_settings

settings = get_settings()

VARIANTS_DIR = "resized"
JPEG_DIR = "jpeg"
GENERATED_DIRS = frozenset({VARIANTS_DIR, JPEG_DIR})

# Must match IMAGE_WIDTHS in frontend/src/utils/image.ts and the hero preload in frontend/index.html
ALLOWED_WIDTHS = frozenset({160, 320, 480, 640, 960, 1280, 1600, 1920})

# preset -> (width, height, pad): with pad the image is fitted inside a canvas of exactly that size,
# otherwise it is only scaled down to fit within it
JPEG_PRESETS: dict[str, tuple[int, int, bool]] = {
    "social": (1200, 630, True),   # og:image / twitter:image link-preview card
    "feed": (1600, 1600, False),   # Google Merchant / Meta catalog image_link
    "email": (400, 400, False),    # order emails: most mail clients can't show AVIF/WebP
}

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

    Images already narrower than ``width`` are never upscaled, only re-encoded at their own size.
    Some uploads are barely compressed, so that re-encode is often far smaller (a 450 KB hero
    became ~100 KB); if it isn't, the original is stored as the variant instead.
    """
    pil_format, save_options, _ = FORMATS[source.suffix.lower()]

    with Image.open(source) as img:
        image = ImageOps.exif_transpose(img)
        if image.mode == "P":
            image = image.convert("RGBA")
        if pil_format == "JPEG" and image.mode != "RGB":
            image = image.convert("RGB")
        if image.width > width:
            height = max(1, round(image.height * width / image.width))
            image = image.resize((width, height), Image.LANCZOS)
        _save_atomic(image, target, pil_format, save_options)

    if target.stat().st_size >= source.stat().st_size:
        # Re-encoding didn't help; cache the original bytes so this check doesn't repeat per request
        tmp = target.with_name(f".{target.name}.{uuid.uuid4().hex}.tmp")
        try:
            shutil.copyfile(source, tmp)
            os.replace(tmp, target)
        finally:
            tmp.unlink(missing_ok=True)

    return target


def jpeg_path(relative: Path, preset: str) -> Path:
    return upload_root() / JPEG_DIR / preset / relative.with_name(f"{relative.name}.jpg")


def jpeg_url(url: str | None, preset: str) -> str | None:
    """URL of the JPEG copy of an uploaded image (``/uploads/...``), or None for any other URL."""
    if not url or not url.startswith("/uploads/"):
        return None
    relative = url.removeprefix("/uploads/")
    if relative.split("/", 1)[0] in GENERATED_DIRS:
        return None
    return f"/uploads/{JPEG_DIR}/{preset}/{relative}.jpg"


def create_jpeg(source: Path, target: Path, preset: str) -> Path:
    """Write ``source`` as a JPEG sized for ``preset`` (see JPEG_PRESETS) at ``target``."""
    width, height, pad = JPEG_PRESETS[preset]

    with Image.open(source) as img:
        image = ImageOps.exif_transpose(img)
        if image.mode in ("RGBA", "LA", "P"):
            image = image.convert("RGBA")
            flattened = Image.new("RGB", image.size, "white")
            flattened.paste(image, mask=image.getchannel("A"))
            image = flattened
        else:
            image = image.convert("RGB")

        image.thumbnail((width, height), Image.LANCZOS)
        if pad:
            # Fill the bars with the photo's own edge colour so studio backgrounds blend in
            strip = max(1, image.width // 50)
            edges = [image.crop((0, 0, strip, image.height)), image.crop((image.width - strip, 0, image.width, image.height))]
            colour = tuple(round(sum(ImageStat.Stat(e).mean[i] for e in edges) / 2) for i in range(3))
            canvas = Image.new("RGB", (width, height), colour)
            canvas.paste(image, ((width - image.width) // 2, (height - image.height) // 2))
            image = canvas

        _save_atomic(image, target, "JPEG", FORMATS[".jpg"][1])

    return target


def _save_atomic(image: Image.Image, target: Path, pil_format: str, save_options: dict) -> None:
    # Write to a temp file and rename so concurrent requests never serve a half-written image
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_name(f".{target.name}.{uuid.uuid4().hex}.tmp")
    try:
        image.save(tmp, format=pil_format, **save_options)
        os.replace(tmp, target)
    finally:
        tmp.unlink(missing_ok=True)


def delete_variants(url: str) -> None:
    """Remove every resized and JPEG copy of an uploaded file (given its /uploads/... URL)."""
    relative = Path(url.removeprefix("/uploads/"))
    for width in ALLOWED_WIDTHS:
        variant_path(relative, width).unlink(missing_ok=True)
    for preset in JPEG_PRESETS:
        jpeg_path(relative, preset).unlink(missing_ok=True)
