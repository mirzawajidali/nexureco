from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.utils.image_variants import (
    ALLOWED_WIDTHS,
    FORMATS,
    GENERATED_DIRS,
    JPEG_PRESETS,
    create_jpeg,
    create_variant,
    jpeg_path,
    upload_root,
    variant_path,
)

# Upload filenames are random UUIDs and never overwritten, so they're safe to cache for a year
IMMUTABLE_CACHE = "public, max-age=31536000, immutable"

router = APIRouter(include_in_schema=False)


class ImmutableStaticFiles(StaticFiles):
    """StaticFiles that marks every response as cacheable for a year."""

    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = IMMUTABLE_CACHE
        return response


def _source_image(path: str) -> Path:
    """The original uploaded image at ``path`` (relative to the upload dir), or a 404."""
    root = upload_root()
    source = (root / path).resolve()
    if (
        not source.is_relative_to(root)
        or source.suffix.lower() not in FORMATS
        or not source.is_file()
        or source.relative_to(root).parts[0] in GENERATED_DIRS
    ):
        raise HTTPException(status_code=404)
    return source


@router.get("/uploads/resized/{width}/{path:path}")
async def resized_upload(width: int, path: str):
    """Serve an uploaded image scaled down to ``width`` px, generating it on first request."""
    if width not in ALLOWED_WIDTHS:
        raise HTTPException(status_code=404)

    source = _source_image(path)
    target = variant_path(source.relative_to(upload_root()), width)
    served: Path = target if target.is_file() else await run_in_threadpool(create_variant, source, target, width)

    return FileResponse(
        served,
        media_type=FORMATS[source.suffix.lower()][2],
        headers={"Cache-Control": IMMUTABLE_CACHE},
    )


@router.get("/uploads/jpeg/{preset}/{path:path}")
async def jpeg_upload(preset: str, path: str):
    """Serve an uploaded image as a JPEG sized for ``preset`` (link previews, shopping feeds)."""
    if preset not in JPEG_PRESETS or not path.endswith(".jpg"):
        raise HTTPException(status_code=404)

    source = _source_image(path.removesuffix(".jpg"))
    target = jpeg_path(source.relative_to(upload_root()), preset)
    served: Path = target if target.is_file() else await run_in_threadpool(create_jpeg, source, target, preset)

    return FileResponse(served, media_type="image/jpeg", headers={"Cache-Control": IMMUTABLE_CACHE})
