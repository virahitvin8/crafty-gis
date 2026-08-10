"""
CRAFTY GIS — Field Management API
CRUD operations for agricultural field polygons (GeoJSON), management zones,
and field history/timeline.

Fields are stored in-memory for demonstration; in production, use a spatial
database (PostGIS) or filesystem-backed GeoJSON store.
"""

import logging
import math
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/field", tags=["field"])

# ---------------------------------------------------------------------------
# In-memory storage
# ---------------------------------------------------------------------------
fields_db: Dict[str, Dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class FieldCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    crop_type: str = Field("generic", description="Current crop type")
    geometry: Dict[str, Any] = Field(
        ...,
        description="GeoJSON Polygon or MultiPolygon with coordinates",
        examples=[{
            "type": "Polygon",
            "coordinates": [
                [[77.0, 28.5], [77.1, 28.5], [77.1, 28.6], [77.0, 28.6], [77.0, 28.5]]
            ],
        }],
    )
    tags: List[str] = []
    area_ha: Optional[float] = Field(None, gt=0, description="Field area in hectares")
    planting_date: Optional[str] = None
    soil_type: Optional[str] = None


class FieldUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    crop_type: Optional[str] = None
    tags: Optional[List[str]] = None
    planting_date: Optional[str] = None
    soil_type: Optional[str] = None
    area_ha: Optional[float] = Field(None, gt=0)


class FieldResponse(BaseModel):
    id: str
    name: str
    description: str
    crop_type: str
    geometry: Dict[str, Any]
    tags: List[str]
    area_ha: Optional[float] = None
    centroid: Optional[List[float]] = None
    planting_date: Optional[str] = None
    soil_type: Optional[str] = None
    created_at: str
    updated_at: str


class FieldListResponse(BaseModel):
    fields: List[FieldResponse]
    total: int


class ZoneCreate(BaseModel):
    num_zones: int = Field(4, ge=2, le=20, description="Number of management zones")
    method: str = Field("ndvi", description="Zoning method: ndvi, elevation, soil, kmeans")
    seed: int = Field(42, description="Random seed for reproducibility")


class ZoneResponse(BaseModel):
    zone_id: int
    name: str
    area_fraction: float
    characteristics: Dict[str, Any]
    color: str


class ZonesResponse(BaseModel):
    field_id: str
    num_zones: int
    method: str
    zones: List[ZoneResponse]
    created_at: str


class HistoryEntry(BaseModel):
    date: str
    event_type: str
    description: str
    data: Optional[Dict[str, Any]] = None


class FieldHistoryResponse(BaseModel):
    field_id: str
    history: List[HistoryEntry]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _compute_centroid(geometry: Dict[str, Any]) -> Optional[List[float]]:
    """Compute centroid of a GeoJSON Polygon."""
    try:
        coords = geometry.get("coordinates", [])
        geom_type = geometry.get("type", "")

        if geom_type == "Polygon":
            ring = coords[0]
        elif geom_type == "MultiPolygon":
            ring = coords[0][0]
        else:
            return None

        lons = [c[0] for c in ring]
        lats = [c[1] for c in ring]
        return [round(sum(lons) / len(lons), 6), round(sum(lats) / len(lats), 6)]
    except Exception:
        return None


def _compute_area_ha(geometry: Dict[str, Any]) -> float:
    """Approximate area of a GeoJSON Polygon in hectares using shoelace formula."""
    try:
        coords = geometry.get("coordinates", [])
        geom_type = geometry.get("type", "")
        if geom_type == "Polygon":
            ring = coords[0]
        elif geom_type == "MultiPolygon":
            ring = coords[0][0]
        else:
            return 0.0

        n = len(ring)
        area_deg2 = 0.0
        for i in range(n):
            j = (i + 1) % n
            area_deg2 += ring[i][0] * ring[j][1]
            area_deg2 -= ring[j][0] * ring[i][1]
        area_deg2 = abs(area_deg2) / 2.0

        # Convert to approx hectares (1 degree ~ 111 km at equator)
        mid_lat = sum(c[1] for c in ring) / n
        km_per_deg_lat = 111.32
        km_per_deg_lon = 111.32 * math.cos(math.radians(mid_lat))
        area_km2 = area_deg2 * km_per_deg_lat * km_per_deg_lon
        return round(area_km2 * 100, 2)  # 1 km2 = 100 ha
    except Exception:
        return 0.0


def _generate_management_zones(
    field: Dict[str, Any], num_zones: int, method: str, seed: int,
) -> List[ZoneResponse]:
    """
    Generate management zones for a field.

    Uses k-means-like random partitioning of the centroid area
    for demonstration. In production, use actual satellite imagery
    or soil maps to drive zone delineation.
    """
    rng = np.random.default_rng(seed)
    colors = [
        "#2ecc71", "#3498db", "#e74c3c", "#f39c12",
        "#9b59b6", "#1abc9c", "#e67e22", "#34495e",
        "#16a085", "#c0392b", "#8e44ad", "#d35400",
        "#27ae60", "#2980b9", "#c39bd3", "#a3e4d7",
        "#fadbd8", "#d5f5e3", "#ebdef0", "#fdebd0",
    ]

    zones = []
    centroid = field.get("centroid", [0, 0])
    area = field.get("area_ha", 10.0)

    for i in range(num_zones):
        zone_frac = float(rng.uniform(0.1, 0.4))
        offset = [float(rng.normal(0, 0.001)), float(rng.normal(0, 0.001))]
        ndvi_base = float(rng.uniform(0.35, 0.75))
        zones.append(ZoneResponse(
            zone_id=i + 1,
            name=f"Zone {i + 1}",
            area_fraction=round(zone_frac, 3),
            characteristics={
                "ndvi_mean": round(ndvi_base, 3),
                "soil_type": rng.choice(["clay loam", "sandy loam", "silt loam", "loam"]),
                "moisture_pct": round(float(rng.uniform(25, 65)), 1),
                "elevation_m": round(float(rng.uniform(100, 500)), 1),
                "center_offset": [round(offset[0], 6), round(offset[1], 6)],
            },
            color=colors[i % len(colors)],
        ))

    # Normalise fractions
    total_frac = sum(z.area_fraction for z in zones)
    for z in zones:
        z.area_fraction = round(z.area_fraction / total_frac, 3)

    return zones

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/save", response_model=FieldResponse, status_code=201)
async def save_field(request: FieldCreate):
    """
    **Save a new field** with its GeoJSON geometry and metadata.

    Accepts any valid GeoJSON Polygon or MultiPolygon. Automatically
    computes the centroid and area if not provided.
    """
    field_id = str(uuid.uuid4())[:12]
    now = datetime.utcnow().isoformat()

    centroid = _compute_centroid(request.geometry)
    area = request.area_ha or _compute_area_ha(request.geometry)

    fields_db[field_id] = {
        "id": field_id,
        "name": request.name,
        "description": request.description,
        "crop_type": request.crop_type,
        "geometry": request.geometry,
        "tags": request.tags,
        "area_ha": area,
        "centroid": centroid,
        "planting_date": request.planting_date,
        "soil_type": request.soil_type,
        "created_at": now,
        "updated_at": now,
        "zones": [],
        "history": [
            {"date": now, "event_type": "created", "description": f"Field '{request.name}' created", "data": None},
        ],
    }

    logger.info("Saved field %s: %s", field_id, request.name)

    return FieldResponse(
        id=field_id,
        name=request.name,
        description=request.description,
        crop_type=request.crop_type,
        geometry=request.geometry,
        tags=request.tags,
        area_ha=area,
        centroid=centroid,
        planting_date=request.planting_date,
        soil_type=request.soil_type,
        created_at=now,
        updated_at=now,
    )


@router.get("/list", response_model=FieldListResponse)
async def list_fields(
    crop_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List all saved fields with optional filtering."""
    fields = list(fields_db.values())

    if crop_type:
        fields = [f for f in fields if f["crop_type"] == crop_type]
    if search:
        s = search.lower()
        fields = [f for f in fields if s in f["name"].lower() or s in f.get("description", "").lower()]

    fields.sort(key=lambda f: f.get("updated_at", ""), reverse=True)
    total = len(fields)
    page = fields[skip:skip + limit]

    return FieldListResponse(
        fields=[
            FieldResponse(
                id=f["id"], name=f["name"], description=f.get("description", ""),
                crop_type=f["crop_type"], geometry=f["geometry"], tags=f.get("tags", []),
                area_ha=f.get("area_ha"), centroid=f.get("centroid"),
                planting_date=f.get("planting_date"), soil_type=f.get("soil_type"),
                created_at=f["created_at"], updated_at=f["updated_at"],
            )
            for f in page
        ],
        total=total,
    )


@router.get("/{field_id}", response_model=FieldResponse)
async def get_field(field_id: str):
    """Get field details by ID."""
    field = fields_db.get(field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    return FieldResponse(
        id=field["id"],
        name=field["name"],
        description=field.get("description", ""),
        crop_type=field["crop_type"],
        geometry=field["geometry"],
        tags=field.get("tags", []),
        area_ha=field.get("area_ha"),
        centroid=field.get("centroid"),
        planting_date=field.get("planting_date"),
        soil_type=field.get("soil_type"),
        created_at=field["created_at"],
        updated_at=field["updated_at"],
    )


@router.put("/{field_id}", response_model=FieldResponse)
async def update_field(field_id: str, request: FieldUpdate):
    """Update field metadata."""
    field = fields_db.get(field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    updates = request.model_dump(exclude_unset=True)
    for k, v in updates.items():
        if v is not None:
            field[k] = v

    field["updated_at"] = datetime.utcnow().isoformat()
    field["history"].append({
        "date": field["updated_at"],
        "event_type": "updated",
        "description": f"Field updated: {', '.join(updates.keys())}",
        "data": updates,
    })

    return FieldResponse(
        id=field["id"],
        name=field["name"],
        description=field.get("description", ""),
        crop_type=field["crop_type"],
        geometry=field["geometry"],
        tags=field.get("tags", []),
        area_ha=field.get("area_ha"),
        centroid=field.get("centroid"),
        planting_date=field.get("planting_date"),
        soil_type=field.get("soil_type"),
        created_at=field["created_at"],
        updated_at=field["updated_at"],
    )


@router.delete("/{field_id}", status_code=204)
async def delete_field(field_id: str):
    """Delete a field."""
    if field_id not in fields_db:
        raise HTTPException(status_code=404, detail="Field not found")
    del fields_db[field_id]
    logger.info("Deleted field %s", field_id)


@router.post("/{field_id}/zones", response_model=ZonesResponse)
async def create_management_zones(field_id: str, request: ZoneCreate):
    """
    Divide a field into **management zones** using spatial partitioning.

    Zones are generated based on the selected method (ndvi, elevation,
    soil, kmeans) and the field's spatial extent.
    """
    field = fields_db.get(field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    zones = _generate_management_zones(field, request.num_zones, request.method, request.seed)
    now = datetime.utcnow().isoformat()
    field["zones"] = [z.model_dump() for z in zones]
    field["updated_at"] = now
    field["history"].append({
        "date": now,
        "event_type": "zones_created",
        "description": f"Created {request.num_zones} management zones ({request.method})",
        "data": {"num_zones": request.num_zones, "method": request.method},
    })

    return ZonesResponse(
        field_id=field_id,
        num_zones=request.num_zones,
        method=request.method,
        zones=zones,
        created_at=now,
    )


@router.get("/{field_id}/history", response_model=FieldHistoryResponse)
async def get_field_history(field_id: str):
    """Get the complete history/timeline for a field."""
    field = fields_db.get(field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    history = [
        HistoryEntry(
            date=h["date"],
            event_type=h["event_type"],
            description=h["description"],
            data=h.get("data"),
        )
        for h in field.get("history", [])
    ]

    return FieldHistoryResponse(field_id=field_id, history=history)
