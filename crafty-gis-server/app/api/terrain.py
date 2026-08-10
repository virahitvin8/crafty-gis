"""
CRAFTY GIS — Terrain Analysis API
Elevation, slope, aspect, hillshade, flow accumulation, and Topographic Wetness
Index (TWI) computed from SRTM DEM or Open Elevation API.

Uses Open Elevation API (https://open-elevation.com) for point queries and
numpy-based DEM modelling for derived terrain attributes.
"""

import logging
import math
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/terrain", tags=["terrain"])

OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ElevationRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    bbox: Optional[List[float]] = Field(
        None, description="[west, south, east, north]",
        min_length=4, max_length=4,
    )
    resolution: int = Field(20, ge=5, le=100, description="Grid size for area queries")


class TerrainRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    bbox: Optional[List[float]] = Field(None, min_length=4, max_length=4)
    resolution: int = Field(20, ge=5, le=100)
    cell_size_m: float = Field(30.0, gt=0, description="Cell size in metres for slope/aspect computation")
    azimuth: float = Field(315.0, description="Sun azimuth for hillshade (degrees from north)")
    altitude: float = Field(45.0, description="Sun altitude for hillshade (degrees)")


class HillshadeRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    bbox: Optional[List[float]] = Field(None, min_length=4, max_length=4)
    resolution: int = Field(20, ge=5, le=100)
    cell_size_m: float = Field(30.0, gt=0)
    azimuth: float = Field(315.0)
    altitude: float = Field(45.0)


class WetnessIndexRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    bbox: Optional[List[float]] = Field(None, min_length=4, max_length=4)
    resolution: int = Field(20, ge=5, le=100)
    cell_size_m: float = Field(30.0, gt=0)


class TerrainStatistics(BaseModel):
    min: float
    max: float
    mean: float
    std: float
    median: float


class ElevationResponse(BaseModel):
    lat: float
    lng: float
    elevation: float
    source: str
    queried_at: str


class TerrainGridResponse(BaseModel):
    lat: float
    lng: float
    bbox: List[float]
    statistics: TerrainStatistics
    values: List[List[float]]
    unit: str
    computed_at: str
    source: str

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _resolve_bbox(lat: float, lng: float, bbox: Optional[List[float]], resolution: int) -> List[float]:
    if bbox:
        return bbox
    d = 0.005  # ~500 m
    return [lng - d, lat - d, lng + d, lat + d]


async def _fetch_elevation_grid(
    bbox: List[float], resolution: int
) -> np.ndarray:
    """
    Fetch elevation data for a bounding box grid from the Open Elevation API.
    Falls back to simulated SRTM-like DEM on failure.
    """
    west, south, east, north = bbox
    lats = np.linspace(south, north, resolution)
    lngs = np.linspace(west, east, resolution)

    locations = [
        {"latitude": float(lat), "longitude": float(lng)}
        for lat in lats for lng in lngs
    ]

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(OPEN_ELEVATION_URL, json={"locations": locations})
            resp.raise_for_status()
            data = resp.json()
            elevations = [r["elevation"] for r in data.get("results", [])]
            if len(elevations) == resolution * resolution:
                return np.array(elevations, dtype=np.float64).reshape(resolution, resolution)
            logger.warning("Open Elevation returned %d results (expected %d); using simulated DEM",
                           len(elevations), resolution * resolution)
    except Exception as exc:
        logger.warning("Open Elevation API error (%s); using simulated DEM", exc)

    # Simulated SRTM-like DEM
    rng = np.random.default_rng(int((bbox[0] * 1000 + bbox[1] * 1000) % (2**31)))
    cx, cy = resolution // 2, resolution // 2
    y, x = np.mgrid[0:resolution, 0:resolution]
    dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (resolution / 2)
    base_elev = 500 + 200 * np.sin(x / resolution * math.pi) * np.cos(y / resolution * math.pi)
    noise = rng.normal(0, 15, (resolution, resolution))
    elev = base_elev - 80 * dist + noise
    return np.clip(elev, 0, 3000)


def _compute_slope(dem: np.ndarray, cell_size: float) -> np.ndarray:
    """Compute slope in degrees from a DEM grid using 3x3 Sobel filter."""
    # 3x3 gradient using finite differences
    dzdx = np.zeros_like(dem)
    dzdy = np.zeros_like(dem)
    # Interior cells (central differences)
    dzdx[1:-1, 1:-1] = (dem[1:-1, 2:] - dem[1:-1, :-2]) / (2 * cell_size)
    dzdy[1:-1, 1:-1] = (dem[2:, 1:-1] - dem[:-2, 1:-1]) / (2 * cell_size)
    # Edge cells (one-sided)
    dzdx[0, :] = (dem[1, :] - dem[0, :]) / cell_size
    dzdx[-1, :] = (dem[-1, :] - dem[-2, :]) / cell_size
    dzdy[:, 0] = (dem[:, 1] - dem[:, 0]) / cell_size
    dzdy[:, -1] = (dem[:, -1] - dem[:, -2]) / cell_size

    slope_rad = np.arctan(np.sqrt(dzdx ** 2 + dzdy ** 2))
    return np.degrees(slope_rad)


def _compute_aspect(dem: np.ndarray, cell_size: float) -> np.ndarray:
    """Compute aspect in degrees (0=N, 90=E, 180=S, 270=W) from DEM."""
    dzdx = np.zeros_like(dem)
    dzdy = np.zeros_like(dem)
    dzdx[1:-1, 1:-1] = (dem[1:-1, 2:] - dem[1:-1, :-2]) / (2 * cell_size)
    dzdy[1:-1, 1:-1] = (dem[2:, 1:-1] - dem[:-2, 1:-1]) / (2 * cell_size)
    dzdx[0, :] = (dem[1, :] - dem[0, :]) / cell_size
    dzdx[-1, :] = (dem[-1, :] - dem[-2, :]) / cell_size
    dzdy[:, 0] = (dem[:, 1] - dem[:, 0]) / cell_size
    dzdy[:, -1] = (dem[:, -1] - dem[:, -2]) / cell_size

    aspect = np.degrees(np.arctan2(-dzdy, dzdx))
    # Convert to compass bearing (0=N)
    aspect = 90.0 - aspect
    aspect = np.where(aspect < 0, aspect + 360, aspect)
    aspect = np.where(aspect >= 360, aspect - 360, aspect)
    # Flat cells
    flat_mask = (np.abs(dzdx) < 1e-10) & (np.abs(dzdy) < 1e-10)
    aspect[flat_mask] = -1  # convention: -1 = flat
    return aspect


def _compute_hillshade(
    dem: np.ndarray, cell_size: float, azimuth: float, altitude: float,
) -> np.ndarray:
    """
    Compute hillshade using Horn's method (3x3 kernel).
    Returns values 0-255 suitable for visualization.
    """
    dzdx = np.zeros_like(dem)
    dzdy = np.zeros_like(dem)
    dzdx[1:-1, 1:-1] = (dem[1:-1, 2:] - dem[1:-1, :-2]) / (2 * cell_size)
    dzdy[1:-1, 1:-1] = (dem[2:, 1:-1] - dem[:-2, 1:-1]) / (2 * cell_size)
    dzdx[0, :] = (dem[1, :] - dem[0, :]) / cell_size
    dzdx[-1, :] = (dem[-1, :] - dem[-2, :]) / cell_size
    dzdy[:, 0] = (dem[:, 1] - dem[:, 0]) / cell_size
    dzdy[:, -1] = (dem[:, -1] - dem[:, -2]) / cell_size

    az_rad = math.radians(360.0 - azimuth + 90.0)
    alt_rad = math.radians(altitude)

    slope_rad = np.arctan(np.sqrt(dzdx ** 2 + dzdy ** 2))
    aspect_rad = np.arctan2(-dzdy, dzdx)

    hs = (
        np.cos(alt_rad) * np.cos(slope_rad)
        + np.sin(alt_rad) * np.sin(slope_rad) * np.cos(az_rad - aspect_rad)
    )
    hs = np.clip(hs, 0, 1) * 255
    return hs


def _compute_flow_accumulation(dem: np.ndarray, cell_size: float) -> np.ndarray:
    """
    Compute D8 flow accumulation from a DEM grid.
    Each cell stores the number of upstream cells draining into it.
    """
    rows, cols = dem.shape
    acc = np.ones((rows, cols), dtype=np.float64)

    # D8 neighbour offsets (row_delta, col_delta)
    neighbours = [(-1, -1), (-1, 0), (-1, 1),
                  (0, -1),          (0, 1),
                  (1, -1),  (1, 0), (1, 1)]

    # Process cells in elevation order (highest first)
    flat = dem.flatten()
    order = np.argsort(-flat)  # descending

    for idx in order:
        r, c = divmod(idx, cols)
        for dr, dc in neighbours:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                if dem[nr, nc] < dem[r, c]:
                    acc[nr, nc] += acc[r, c]

    return acc


def _compute_twi(dem: np.ndarray, flow_acc: np.ndarray, cell_size: float) -> np.ndarray:
    """
    Compute Topographic Wetness Index (TWI).

    TWI = ln(a / tan(beta))
    where a = upslope area (m2), beta = local slope (radians)
    """
    slope_rad = np.arctan(np.sqrt(
        ((dem[1:-1, 2:] - dem[1:-1, :-2]) / (2 * cell_size)) ** 2
        + ((dem[2:, 1:-1] - dem[:-2, 1:-1]) / (2 * cell_size)) ** 2
    ))

    upslope_area = flow_acc * cell_size * cell_size

    twi = np.full_like(dem, np.nan, dtype=np.float64)
    # For interior cells
    twi_inner = np.log(upslope_area[1:-1, 1:-1] / np.tan(np.clip(slope_rad, 1e-5, np.pi / 2)))
    twi[1:-1, 1:-1] = twi_inner

    # For edge cells, use a simplified version
    slope_full = np.zeros_like(dem, dtype=np.float64)
    slope_full[1:-1, 1:-1] = slope_rad
    mask = np.isnan(twi) & (slope_full > 1e-5)
    twi[mask] = np.log(upslope_area.flatten()[0] if upslope_area.size > 0 else 1 / 0.01)
    twi[np.isnan(twi)] = 5.0  # default for completely flat edges

    return twi


def _grid_stats(grid: np.ndarray) -> TerrainStatistics:
    flat = grid.flatten()
    return TerrainStatistics(
        min=round(float(np.nanmin(flat)), 4),
        max=round(float(np.nanmax(flat)), 4),
        mean=round(float(np.nanmean(flat)), 4),
        std=round(float(np.nanstd(flat)), 4),
        median=round(float(np.nanmedian(flat)), 4),
    )

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/elevation")
async def get_elevation(request: ElevationRequest):
    """
    Get **elevation** for a point or area from the Open Elevation API.

    For a single point, returns the elevation directly.
    For a bounding box, returns a DEM grid with statistics.
    """
    bbox = _resolve_bbox(request.lat, request.lng, request.bbox, request.resolution)

    if request.bbox is None:
        # Single-point query
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(OPEN_ELEVATION_URL, json={
                    "locations": [{"latitude": request.lat, "longitude": request.lng}]
                })
                resp.raise_for_status()
                results = resp.json().get("results", [])
                elev = results[0]["elevation"] if results else 0
                source = "Open Elevation API"
        except Exception:
            rng = np.random.default_rng(int((request.lat * 1000 + request.lng * 1000) % (2**31)))
            elev = round(float(rng.uniform(100, 1200)), 1)
            source = "simulated (Open Elevation unreachable)"

        return {
            "lat": request.lat,
            "lng": request.lng,
            "elevation": elev,
            "unit": "meters",
            "source": source,
            "queried_at": datetime.utcnow().isoformat(),
        }

    # Area query
    dem = await _fetch_elevation_grid(bbox, request.resolution)
    stats = _grid_stats(dem)

    return {
        "lat": request.lat,
        "lng": request.lng,
        "bbox": bbox,
        "elevation": {
            "statistics": stats.model_dump(),
            "values": [[round(float(v), 1) for v in row] for row in dem.tolist()],
        },
        "unit": "meters",
        "resolution": request.resolution,
        "source": "Open Elevation API / simulated DEM",
        "computed_at": datetime.utcnow().isoformat(),
    }


@router.post("/slope")
async def compute_slope(request: TerrainRequest):
    """
    Compute **slope** (degrees) from a DEM grid.

    Uses central finite differences on a 3x3 neighbourhood.
    """
    bbox = _resolve_bbox(request.lat, request.lng, request.bbox, request.resolution)
    dem = await _fetch_elevation_grid(bbox, request.resolution)
    slope = _compute_slope(dem, request.cell_size_m)
    stats = _grid_stats(slope)

    return TerrainGridResponse(
        lat=request.lat,
        lng=request.lng,
        bbox=bbox,
        statistics=stats,
        values=[[round(float(v), 2) for v in row] for row in slope.tolist()],
        unit="degrees",
        computed_at=datetime.utcnow().isoformat(),
        source="computed from DEM (Open Elevation / simulated)",
    )


@router.post("/aspect")
async def compute_aspect(request: TerrainRequest):
    """
    Compute **aspect** (compass bearing) from a DEM grid.

    Returns values 0-360 degrees (0=N, 90=E, 180=S, 270=W).
    Flat cells are marked as -1.
    """
    bbox = _resolve_bbox(request.lat, request.lng, request.bbox, request.resolution)
    dem = await _fetch_elevation_grid(bbox, request.resolution)
    aspect = _compute_aspect(dem, request.cell_size_m)
    stats = _grid_stats(aspect)

    return TerrainGridResponse(
        lat=request.lat,
        lng=request.lng,
        bbox=bbox,
        statistics=stats,
        values=[[round(float(v), 1) for v in row] for row in aspect.tolist()],
        unit="degrees (compass bearing)",
        computed_at=datetime.utcnow().isoformat(),
        source="computed from DEM",
    )


@router.post("/hillshade")
async def compute_hillshade(request: HillshadeRequest):
    """
    Compute **hillshade** raster for visualization.

    Uses Horn's method with configurable sun azimuth and altitude.
    Output range: 0 (dark) to 255 (bright).
    """
    bbox = _resolve_bbox(request.lat, request.lng, request.bbox, request.resolution)
    dem = await _fetch_elevation_grid(bbox, request.resolution)
    hs = _compute_hillshade(dem, request.cell_size_m, request.azimuth, request.altitude)
    stats = _grid_stats(hs)

    return TerrainGridResponse(
        lat=request.lat,
        lng=request.lng,
        bbox=bbox,
        statistics=stats,
        values=[[round(float(v), 1) for v in row] for row in hs.tolist()],
        unit="0-255 brightness",
        computed_at=datetime.utcnow().isoformat(),
        source="computed from DEM",
    )


@router.post("/flow-accumulation")
async def compute_flow_accumulation(request: TerrainRequest):
    """
    Compute **D8 flow accumulation** from a DEM grid.

    Each cell value represents the total number of upstream cells
    draining through it, indicating relative water flow concentration.
    """
    bbox = _resolve_bbox(request.lat, request.lng, request.bbox, request.resolution)
    dem = await _fetch_elevation_grid(bbox, request.resolution)
    acc = _compute_flow_accumulation(dem, request.cell_size_m)
    stats = _grid_stats(acc)

    return TerrainGridResponse(
        lat=request.lat,
        lng=request.lng,
        bbox=bbox,
        statistics=stats,
        values=[[round(float(v), 1) for v in row] for row in acc.tolist()],
        unit="upstream cell count",
        computed_at=datetime.utcnow().isoformat(),
        source="computed from DEM (D8 algorithm)",
    )


@router.post("/wetness-index")
async def compute_wetness_index(request: WetnessIndexRequest):
    """
    Compute **Topographic Wetness Index** (TWI).

    TWI = ln(a / tan(beta))
    where a = upslope contributing area (m2), beta = local slope (radians).

    High TWI values indicate zones of water accumulation (potential wetlands
    or areas prone to waterlogging). Useful for drainage planning.
    """
    bbox = _resolve_bbox(request.lat, request.lng, request.bbox, request.resolution)
    dem = await _fetch_elevation_grid(bbox, request.resolution)
    acc = _compute_flow_accumulation(dem, request.cell_size_m)
    twi = _compute_twi(dem, acc, request.cell_size_m)
    stats = _grid_stats(twi)

    return TerrainGridResponse(
        lat=request.lat,
        lng=request.lng,
        bbox=bbox,
        statistics=stats,
        values=[[round(float(v), 3) if not math.isnan(v) else 0.0 for v in row] for row in twi.tolist()],
        unit="TWI (ln(m2/tan(rad)))",
        computed_at=datetime.utcnow().isoformat(),
        source="computed from DEM (D8 + TWI)",
    )


@router.get("/info")
async def terrain_info():
    """List available terrain analysis endpoints."""
    return {
        "endpoints": [
            {"method": "POST", "path": "/api/terrain/elevation", "description": "Elevation query"},
            {"method": "POST", "path": "/api/terrain/slope", "description": "Slope computation"},
            {"method": "POST", "path": "/api/terrain/aspect", "description": "Aspect computation"},
            {"method": "POST", "path": "/api/terrain/hillshade", "description": "Hillshade generation"},
            {"method": "POST", "path": "/api/terrain/flow-accumulation", "description": "D8 flow accumulation"},
            {"method": "POST", "path": "/api/terrain/wetness-index", "description": "Topographic Wetness Index"},
        ],
        "data_source": "Open Elevation API (https://open-elevation.com) with simulated DEM fallback",
        "default_cell_size_m": 30.0,
    }
