import io
import os
import uuid
from fastapi import UploadFile
from PIL import Image
from app.config import get_settings

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
) -> dict:
    """Save file and return dict with url, original_filename, file_size, content_type, width, height."""
    original_filename = file.filename or "unknown"
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type {ext} not allowed. Allowed: {ALLOWED_EXTENSIONS}")

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds {settings.MAX_FILE_SIZE // (1024*1024)}MB limit")

    filename = f"{uuid.uuid4().hex}{ext}"
    folder_path = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, filename)

    # Optimize image
    img = Image.open(io.BytesIO(content))
    original_width, original_height = img.width, img.height

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

    # Get saved file size
    saved_size = os.path.getsize(file_path)
    content_type = MIME_MAP.get(ext, file.content_type or "application/octet-stream")

    return {
        "url": f"/uploads/{subfolder}/{filename}",
        "original_filename": original_filename,
        "file_size": saved_size,
        "content_type": content_type,
        "width": img.width,
        "height": img.height,
    }


def delete_upload_file(url: str) -> None:
    if url.startswith("/uploads/"):
        file_path = url.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)
