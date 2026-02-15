from fastapi import APIRouter, Depends, UploadFile, File
from app.core.dependencies import get_current_admin
from app.utils.file_upload import save_upload_file
from app.models.user import User

router = APIRouter(prefix="/media", tags=["Media"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    subfolder: str = "general",
    admin: User = Depends(get_current_admin),
):
    url = await save_upload_file(file, subfolder=subfolder)
    return {"url": url}
