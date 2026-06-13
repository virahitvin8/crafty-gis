"""
CRAFTY GIS — Data API
Data source management, file downloads, uploads, and data exploration.
"""

import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel

from app.services.data_downloader import DataDownloader
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data", tags=["data"])

downloader = DataDownloader()


class DownloadRequest(BaseModel):
    source: str
    params: Dict[str, Any] = {}
    project_id: Optional[str] = None


class DownloadStatus(BaseModel):
    download_id: str
    source: str
    status: str
    progress: float = 0.0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DataSourceInfo(BaseModel):
    id: str
    name: str
    description: str
    type: str
    free_access: bool
    requires_auth: bool
    url: str


@router.post("/download")
async def download_data(request: DownloadRequest):
    """Download data from a specified source."""
    try:
        result = await downloader.download(request.source, request.params)
        return {
            "message": f"Data download initiated from {request.source}",
            "source": request.source,
            "result": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.get("/sources")
async def get_data_sources():
    """Get all available data sources."""
    return {
        "sources": [
            {
                "id": "sentinel-2",
                "name": "Copernicus Sentinel-2",
                "description": "13-band multispectral optical imagery at 10-60m resolution",
                "type": "satellite",
                "free_access": True,
                "requires_auth": False,
                "url": "https://dataspace.copernicus.eu/",
                "bands": ["B1 (Coastal)", "B2 (Blue)", "B3 (Green)", "B4 (Red)", "B5-7 (Red Edge)", "B8 (NIR)", "B8A (Narrow NIR)", "B9 (Water Vapor)", "B10 (SWIR-Cirrus)", "B11-12 (SWIR)"],
                "applications": ["LULC", "Vegetation Indices", "Change Detection", "Crop Health"],
            },
            {
                "id": "sentinel-1",
                "name": "Copernicus Sentinel-1",
                "description": "C-band Synthetic Aperture Radar (SAR) imagery, all-weather",
                "type": "satellite",
                "free_access": True,
                "requires_auth": False,
                "url": "https://dataspace.copernicus.eu/",
                "polarization": ["VV", "VH", "HH", "HV"],
                "applications": ["Flood Mapping", "Soil Moisture", "Deformation", "Deforestation"],
            },
            {
                "id": "landsat",
                "name": "NASA/USGS Landsat",
                "description": "Longest-running Earth observation program (since 1972), 30m resolution",
                "type": "satellite",
                "free_access": True,
                "requires_auth": False,
                "url": "https://earthexplorer.usgs.gov/",
                "collections": ["Landsat 8-9 C2 L1", "Landsat 8-9 C2 L2", "Landsat 4-7 C2 L2"],
                "applications": ["Historical Land Cover", "Urban Expansion", "Climate Analysis"],
            },
            {
                "id": "modis",
                "name": "NASA MODIS",
                "description": "Daily global coverage at 250m-1km, Terra and Aqua satellites",
                "type": "satellite",
                "free_access": True,
                "requires_auth": False,
                "url": "https://search.earthdata.nasa.gov/",
                "products": ["MOD13Q1 (Vegetation Indices)", "MOD11A2 (LST)", "MCD12Q1 (Land Cover)"],
                "applications": ["Fire Detection", "Vegetation Health", "Ocean Color", "Global Monitoring"],
            },
            {
                "id": "srtm",
                "name": "NASA SRTM DEM",
                "description": "Global Digital Elevation Model at 30m resolution",
                "type": "raster",
                "free_access": True,
                "requires_auth": False,
                "url": "https://portal.opentopography.org/",
                "resolution": "30m (SRTMGL3), 90m (SRTMGL1)",
                "applications": ["Terrain Analysis", "Hydrology", "Watershed Delineation"],
            },
            {
                "id": "openstreetmap",
                "name": "OpenStreetMap",
                "description": "Collaborative global map with roads, buildings, land use, boundaries",
                "type": "vector",
                "free_access": True,
                "requires_auth": False,
                "url": "https://www.openstreetmap.org/",
                "features": ["Roads", "Buildings", "Land Use", "Water Bodies", "Administrative Boundaries"],
                "applications": ["Base Maps", "Urban Analysis", "Network Analysis"],
            },
            {
                "id": "chirps",
                "name": "CHIRPS Rainfall",
                "description": "Global rainfall dataset at 5km resolution from 1981-present",
                "type": "climate",
                "free_access": True,
                "requires_auth": False,
                "url": "https://data.chc.ucsb.edu/products/CHIRPS-2.0/",
                "resolution": "0.05° (~5km)",
                "applications": ["Drought Monitoring", "Agricultural Analysis", "Climate Studies"],
            },
            {
                "id": "era5",
                "name": "ERA5 Climate Reanalysis",
                "description": "Global climate data from 1940-present, hourly estimates",
                "type": "climate",
                "free_access": True,
                "requires_auth": True,
                "url": "https://cds.climate.copernicus.eu/",
                "variables": ["Temperature", "Precipitation", "Pressure", "Wind", "Humidity"],
                "applications": ["Climate Analysis", "Weather Modeling", "Environmental Studies"],
            },
            {
                "id": "gbif",
                "name": "GBIF Biodiversity",
                "description": "Global biodiversity occurrence data (species records)",
                "type": "biodiversity",
                "free_access": True,
                "requires_auth": False,
                "url": "https://www.gbif.org/",
                "data_type": "Species Occurrence Records",
                "applications": ["Species Distribution", "Habitat Suitability", "Biodiversity Studies"],
            },
        ]
    }


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    project_id: str = Form(None),
    description: str = Form(""),
):
    """Upload a file (shapefile, raster, CSV, etc.) for analysis."""
    upload_dir = os.path.join(settings.DATA_DIR, "uploads", project_id or "default")
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)
    
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        file_size = len(content)
        file_ext = os.path.splitext(file.filename)[1].lower()

        return {
            "message": f"File uploaded: {file.filename}",
            "file_name": file.filename,
            "file_path": file_path,
            "file_size_bytes": file_size,
            "file_size_display": f"{file_size / 1024:.1f} KB" if file_size < 1024**2 else f"{file_size / 1024**2:.1f} MB",
            "file_type": file_ext,
            "project_id": project_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/files/{project_id}")
async def list_project_files(project_id: str):
    """List files for a project."""
    project_dir = os.path.join(settings.DATA_DIR, "uploads", project_id)
    if not os.path.exists(project_dir):
        return {"files": []}

    files = []
    for f in os.listdir(project_dir):
        file_path = os.path.join(project_dir, f)
        if os.path.isfile(file_path):
            stat = os.stat(file_path)
            files.append({
                "name": f,
                "path": file_path,
                "size_bytes": stat.st_size,
                "size_display": f"{stat.st_size / 1024:.1f} KB" if stat.st_size < 1024**2 else f"{stat.st_size / 1024**2:.1f} MB",
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })

    return {"files": files}


@router.get("/download/{file_path:path}")
async def download_file(file_path: str):
    """Download a processed file."""
    full_path = os.path.join(settings.DATA_DIR, file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(full_path, filename=os.path.basename(full_path))


@router.get("/explore/{source}")
async def explore_source(source: str):
    """Get detailed information about a data source."""
    sources_response = await get_data_sources()
    for s in sources_response["sources"]:
        if s["id"] == source:
            return {"source": s}
    raise HTTPException(status_code=404, detail="Data source not found")
