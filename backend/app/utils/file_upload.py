import io
import os
import re
import uuid
from fastapi import UploadFile
from starlette.concurrency import run_in_threadpool
from PIL import Image, ImageOps
from slugify import slugify
from app.config import get_settings
from app.utils.image_variants import delete_variants

settings = get_settings()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"}

MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
}


async def save_upload_file(
    file: UploadFile,
    subfolder: str = "products",
    max_width: int = 1200,
) -> str:
    """Save file and return URL path. Use save_upload_file_with_meta for full metadata."""
    meta = await save_upload_file_with_meta(file, subfolder, max_width)
    return meta["url"]


async def save_upload_file_with_meta(
    file: UploadFile,
    subfolder: str = "products",
    max_width: int = 1200,
    name_hint: str | None = None,
) -> dict:
    """Save file and return dict with url, original_filename, file_size, content_type, width, height.

    ``name_hint`` (e.g. the product's slug) makes a descriptive file name such as
    ``essential-tee-3f9a1c2b7d4e.avif`` for image search; the random suffix keeps names unique,
    so files are never overwritten and stay safe to cache forever.
    """
    original_filename = file.filename or "unknown"
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type {ext} not allowed. Allowed: {ALLOWED_EXTENSIONS}")

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds {settings.MAX_FILE_SIZE // (1024*1024)}MB limit")

    # A plain folder name only: "../" or a path could otherwise write outside the uploads folder
    subfolder = re.sub(r"[^a-z0-9_-]", "", subfolder.lower()) or "misc"
    stem = slugify(name_hint, max_length=60) if name_hint else ""
    filename = f"{stem}-{uuid.uuid4().hex[:12]}{ext}" if stem else f"{uuid.uuid4().hex}{ext}"
    folder_path = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, filename)

    # Decoding, resizing and encoding (AVIF especially) take 0.5-2 s of CPU: off the event loop, so the
    # rest of the site keeps answering while an image uploads
    width, height = await run_in_threadpool(_optimise_and_save, content, ext, file_path, max_width)

    # Get saved file size
    saved_size = os.path.getsize(file_path)
    content_type = MIME_MAP.get(ext, file.content_type or "application/octet-stream")

    return {
        "url": f"/uploads/{subfolder}/{filename}",
        "original_filename": original_filename,
        "file_size": saved_size,
        "content_type": content_type,
        "width": width,
        "height": height,
    }


def _optimise_and_save(content: bytes, ext: str, file_path: str, max_width: int) -> tuple[int, int]:
    """Resize to at most ``max_width``, re-encode and save; returns the saved width and height."""
    # exif_transpose applies a phone photo's rotation flag, which is lost on save
    # (along with the rest of the EXIF data, GPS location included)
    try:
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(content)))
    except Exception as exc:
        raise ValueError("The file isn't a readable image") from exc

    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)

    # AVIF/WebP support RGBA; others need RGB
    if ext in (".avif", ".webp", ".png"):
        if img.mode == "P":
            img = img.convert("RGBA")
    elif img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # AVIF is more efficient — quality 50 gives similar visual quality to JPEG 85
    save_quality = 50 if ext == ".avif" else 85
    img.save(file_path, quality=save_quality, optimize=True)
    return img.width, img.height


def delete_upload_file(url: str) -> None:
    if url.startswith("/uploads/"):
        file_path = url.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)
        delete_variants(url)
