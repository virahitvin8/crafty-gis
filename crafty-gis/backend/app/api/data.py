"""Data API — manages data downloads, uploads, and file exploration."""

import logging
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
from app.config import settings
from app.services.data_downloader import DataDownloader

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/data", tags=["Data"])

downloader: Optional[DataDownloader] = None


class DownloadRequest(BaseModel):
    source: str  # "sentinel2", "landsat", "dem", "boundary"
    bounds: tuple[float, float, float, float]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location_name: Optional[str] = None


@router.post("/download")
async def download_data(request: DownloadRequest):
    """Download data from various sources."""
    if not downloader:
        raise HTTPException(status_code=503, detail="Data Downloader not initialized")

    try:
        if request.source == "boundary" and request.location_name:
            result = await downloader.download_boundary(request.location_name)
        elif request.source == "dem":
            result = await downloader.download_dem(request.bounds)
        elif request.source == "sentinel2":
            result = await downloader.download_sentinel2(
                request.bounds, request.start_date or "2024-01-01",
                request.end_date or "2024-12-31"
            )
        elif request.source == "landsat":
            result = await downloader.download_landsat(
                request.bounds, request.start_date or "2024-01-01",
                request.end_date or "2024-12-31"
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown source: {request.source}")

        return {"files": [str(p) for p in (result if isinstance(result, list) else [result])]}

    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file (shapefile, GeoTIFF, etc.)."""
    upload_dir = Path(settings.data_dir) / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename
    content = await file.read()
    file_path.write_bytes(content)

    logger.info(f"Uploaded: {file.filename} ({len(content)} bytes)")
    return {
        "filename": file.filename,
        "size": len(content),
        "path": str(file_path),
        "format": file_path.suffix,
    }


@router.get("/files")
async def list_data_files():
    """List all downloaded and uploaded data files."""
    data_dir = Path(settings.data_dir)
    files = []

    for subdir in ["downloads", "outputs", "uploads"]:
        dir_path = data_dir / subdir
        if dir_path.exists():
            for f in dir_path.iterdir():
                if f.is_file() and not f.name.startswith("."):
                    files.append({
                        "name": f.name,
                        "directory": subdir,
                        "path": str(f),
                        "size": f.stat().st_size,
                        "format": f.suffix,
                        "modified": f.stat().st_mtime,
                    })
    return {"files": files}


@router.get("/download/{file_type}/{filename}")
async def download_file(file_type: str, filename: str):
    """Download a specific file."""
    file_path = Path(settings.data_dir) / file_type / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path), filename=filename)
