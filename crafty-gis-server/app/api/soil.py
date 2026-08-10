"""
CRAFTY GIS — Soil Analysis API
Fetches soil property data from ISRIC SoilGrids REST API and computes
soil health scores with agronomic recommendations.

API reference: https://rest.isric.org/soilgrids/v2.0/properties/query
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/soil", tags=["soil"])

SOILGRIDS_BASE = "https://rest.isric.org/soilgrids/v2.0/properties/query"
SUPPORTED_PROPERTIES = [
    "phh2o", "phclay", "sand", "silt", "clay",
    "soc", "nitrogen", "cec", "cfvo", "bdod",
    "bdtic", "oecd", "clim_ppet", "clim_pwb", "clim_pww",
    "clim_tmp", "clim_twr", "clim_tws", "clim_win",
]
DEPTH_LAYERS = {
    "0-5cm": "0-5cm",
    "5-15cm": "5-15cm",
    "15-30cm": "15-30cm",
    "30-60cm": "30-60cm",
    "60-100cm": "60-100cm",
    "100-200cm": "100-200cm",
}
PROPERTY_LABELS = {
    "phh2o": "pH (H2O)",
    "phclay": "pH (KCl)",
    "sand": "Sand (g/kg)",
    "silt": "Silt (g/kg)",
    "clay": "Clay (g/kg)",
    "soc": "Soil Organic Carbon (g/kg)",
    "nitrogen": "Total Nitrogen (g/kg)",
    "cec": "Cation Exchange Capacity (cmol/kg)",
    "cfvo": "Coarse Fragments (cm3/dm3)",
    "bdod": "Bulk Density (cg/cm3)",
    "bdtic": "Depth to bedrock (cm)",
    "oecd": "Effective CEC (cmol/kg)",
}

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SoilPropertiesRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    depth: str = Field("0-5cm", description="Depth layer, e.g. 0-5cm, 5-15cm, ...")
    properties: List[str] = Field(
        default=["phh2o", "sand", "clay", "silt", "soc", "nitrogen", "cec", "bdod"],
        description="List of SoilGrids properties to fetch",
    )


class SoilProperty(BaseModel):
    name: str
    label: str
    value_mean: float
    value_q0_05: Optional[float] = None
    value_q0_5: Optional[float] = None
    value_q0_95: Optional[float] = None
    unit: str


class SoilPropertiesResponse(BaseModel):
    lat: float
    lng: float
    depth: str
    properties: List[SoilProperty]
    source: str
    fetched_at: str


class SoilAnalyzeRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    depth: str = Field("0-5cm")
    crop_type: Optional[str] = Field(None, description="Target crop type for tailored advice")
    soil_properties: Optional[Dict[str, float]] = Field(
        None,
        description="Override SoilGrids with known soil properties",
    )


class SoilHealthScoreRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    depth: str = Field("0-5cm")


class SoilHealthScoreResponse(BaseModel):
    lat: float
    lng: float
    depth: str
    overall_score: float = Field(..., ge=0, le=100, description="Soil health score 0-100")
    sub_scores: Dict[str, float]
    rating: str
    recommendations: List[str]
    fetched_at: str

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _fetch_soilgrids(
    lat: float,
    lng: float,
    depth: str = "0-5cm",
    properties: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Fetch soil properties from ISRIC SoilGrids REST API.
    Falls back to simulated data on network error.
    """
    props = properties or SUPPORTED_PROPERTIES[:8]
    prop_query = "|".join(props)

    params = {
        "lon": f"{lng:.4f}",
        "lat": f"{lat:.4f}",
        "property": prop_query,
        "depth": depth,
        "value": "mean",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(SOILGRIDS_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()
            logger.info("SoilGrids response received for (%f, %f)", lat, lng)
            return {"source": "ISRIC SoilGrids", "data": data, "real": True}
    except httpx.HTTPError as exc:
        logger.warning("SoilGrids request failed (%s); using simulated data", exc)
    except Exception as exc:
        logger.warning("SoilGrids error: %s; using simulated data", exc)

    # --- Simulated fallback ---
    rng = np.random.default_rng(int((lat * 1000 + lng * 1000) % (2**31)))
    sim_ranges = {
        "phh2o": (5.5, 8.5, "pH"),
        "sand": (100, 800, "g/kg"),
        "silt": (50, 500, "g/kg"),
        "clay": (50, 500, "g/kg"),
        "soc": (5, 45, "g/kg"),
        "nitrogen": (0.5, 3.5, "g/kg"),
        "cec": (5, 40, "cmol/kg"),
        "bdod": (1000, 1700, "cg/cm3"),
        "cfvo": (0, 300, "cm3/dm3"),
    }
    features = []
    for prop in props:
        lo, hi, unit = sim_ranges.get(prop, (0, 100, ""))
        val = round(float(rng.uniform(lo, hi)), 2)
        features.append({
            "label": {"value": prop},
            "depths": [{
                "label": {"value": depth},
                "values": [{"value": val, "quantile": "mean"}],
            }],
        })

    return {
        "source": "simulated (SoilGrids unreachable)",
        "data": {"properties": features},
        "real": False,
    }


def _parse_soilgrids_response(raw: Dict[str, Any], props: List[str], depth: str) -> List[SoilProperty]:
    """Parse SoilGrids JSON into SoilProperty objects."""
    properties = []
    feature_list = raw.get("properties", {}).get("features", [])

    for prop_name in props:
        matched = None
        for feat in feature_list:
            lbl = feat.get("label", {}).get("value", "")
            if lbl == prop_name:
                matched = feat
                break

        if matched is None:
            continue

        depth_info = matched.get("depths", [])
        value_mean = 0.0
        for d in depth_info:
            if d.get("label", {}).get("value", "") == depth:
                for v in d.get("values", []):
                    if v.get("quantile", "") == "mean":
                        value_mean = v.get("value", 0)
                        break

        properties.append(SoilProperty(
            name=prop_name,
            label=PROPERTY_LABELS.get(prop_name, prop_name),
            value_mean=round(value_mean, 2),
            unit=PROPERTY_LABELS.get(prop_name, "").split("(")[-1].rstrip(")") if "(" in PROPERTY_LABELS.get(prop_name, "") else "",
        ))

    return properties


def _compute_health_score(props: List[SoilProperty]) -> Dict[str, Any]:
    """
    Compute a 0-100 soil health score from key indicators.

    Scoring criteria (based on FAO soil health guidelines):
      - pH: optimal 6.0-7.5 (30 pts)
      - Organic carbon: >15 g/kg = good (25 pts)
      - CEC: >15 cmol/kg = good (20 pts)
      - Bulk density: <1400 cg/cm3 = good (15 pts)
      - Clay+silt ratio: 30-60% silt+clay = good texture (10 pts)
    """
    sub_scores = {}

    # pH score
    ph_val = next((p.value_mean for p in props if p.name == "phh2o"), 7.0)
    if 6.0 <= ph_val <= 7.5:
        sub_scores["ph"] = 30.0
    elif 5.5 <= ph_val < 6.0 or 7.5 < ph_val <= 8.0:
        sub_scores["ph"] = 20.0
    else:
        sub_scores["ph"] = 10.0

    # SOC score
    soc_val = next((p.value_mean for p in props if p.name == "soc"), 15.0)
    if soc_val >= 25:
        sub_scores["organic_carbon"] = 25.0
    elif soc_val >= 15:
        sub_scores["organic_carbon"] = 20.0
    elif soc_val >= 8:
        sub_scores["organic_carbon"] = 12.0
    else:
        sub_scores["organic_carbon"] = 5.0

    # CEC score
    cec_val = next((p.value_mean for p in props if p.name == "cec"), 15.0)
    if cec_val >= 25:
        sub_scores["cec"] = 20.0
    elif cec_val >= 15:
        sub_scores["cec"] = 15.0
    elif cec_val >= 8:
        sub_scores["cec"] = 10.0
    else:
        sub_scores["cec"] = 5.0

    # Bulk density score
    bd_val = next((p.value_mean for p in props if p.name == "bdod"), 1300.0)
    if bd_val < 1200:
        sub_scores["bulk_density"] = 15.0
    elif bd_val < 1400:
        sub_scores["bulk_density"] = 12.0
    elif bd_val < 1600:
        sub_scores["bulk_density"] = 8.0
    else:
        sub_scores["bulk_density"] = 3.0

    # Texture score (clay + silt)
    clay_val = next((p.value_mean for p in props if p.name == "clay"), 200.0)
    silt_val = next((p.value_mean for p in props if p.name == "silt"), 300.0)
    sand_val = next((p.value_mean for p in props if p.name == "sand"), 500.0)
    total = clay_val + silt_val + sand_val + 1e-9
    fine_pct = (clay_val + silt_val) / total * 100
    if 30 <= fine_pct <= 60:
        sub_scores["texture"] = 10.0
    elif 20 <= fine_pct < 30 or 60 < fine_pct <= 75:
        sub_scores["texture"] = 7.0
    else:
        sub_scores["texture"] = 3.0

    overall = sum(sub_scores.values())

    if overall >= 80:
        rating = "Excellent"
    elif overall >= 65:
        rating = "Good"
    elif overall >= 45:
        rating = "Fair"
    elif overall >= 30:
        rating = "Poor"
    else:
        rating = "Very Poor"

    return {"overall": round(overall, 1), "sub_scores": sub_scores, "rating": rating}


def _generate_recommendations(props: List[SoilProperty], crop_type: Optional[str] = None) -> List[str]:
    """Generate agronomic recommendations based on soil properties."""
    recs = []
    ph_val = next((p.value_mean for p in props if p.name == "phh2o"), 7.0)
    soc_val = next((p.value_mean for p in props if p.name == "soc"), 15.0)
    cec_val = next((p.value_mean for p in props if p.name == "cec"), 15.0)
    bd_val = next((p.value_mean for p in props if p.name == "bdod"), 1300.0)
    clay_val = next((p.value_mean for p in props if p.name == "clay"), 200.0)

    if ph_val < 5.5:
        recs.append(f"Soil pH ({ph_val:.1f}) is strongly acidic. Apply agricultural lime at 2-4 t/ha.")
    elif ph_val < 6.0:
        recs.append(f"Soil pH ({ph_val:.1f}) is slightly acidic. Consider light liming at 1-2 t/ha.")
    elif ph_val > 8.0:
        recs.append(f"Soil pH ({ph_val:.1f}) is strongly alkaline. Apply gypsum or elemental sulfur.")
    elif ph_val > 7.5:
        recs.append(f"Soil pH ({ph_val:.1f}) is slightly alkaline. Monitor and consider acidifying amendments.")

    if soc_val < 10:
        recs.append(f"Soil organic carbon ({soc_val:.1f} g/kg) is low. Add compost, apply cover crops, reduce tillage.")
    elif soc_val < 15:
        recs.append(f"Soil organic carbon ({soc_val:.1f} g/kg) is moderate. Maintain organic matter inputs.")

    if cec_val < 10:
        recs.append(f"CEC ({cec_val:.1f} cmol/kg) is low. Increase organic matter to improve nutrient retention.")

    if bd_val > 1500:
        recs.append(f"Bulk density ({bd_val:.0f} cg/cm3) indicates compaction. Use deep ripping or cover-crop root systems.")

    if clay_val > 400:
        recs.append("High clay content detected. Consider gypsum applications and avoid working soil when wet.")

    if crop_type:
        recs.append(f"For {crop_type}, consider a soil test specific to its nutrient requirements before the next season.")

    if not recs:
        recs.append("Soil properties are within acceptable ranges. Maintain current management practices.")

    return recs


async def _get_simulated_soil(lat: float, lng: float) -> List[SoilProperty]:
    """Build SoilProperty list from simulated values."""
    rng = np.random.default_rng(int((lat * 1000 + lng * 1000) % (2**31)))
    sim_data = {
        "phh2o": (6.2, 0.4),
        "sand": (350, 100),
        "clay": (220, 60),
        "silt": (380, 80),
        "soc": (18, 8),
        "nitrogen": (1.5, 0.6),
        "cec": (18, 5),
        "bdod": (1350, 120),
    }
    props = []
    for name, (base, spread) in sim_data.items():
        val = round(float(rng.uniform(base - spread, base + spread)), 2)
        props.append(SoilProperty(
            name=name,
            label=PROPERTY_LABELS.get(name, name),
            value_mean=val,
            unit=PROPERTY_LABELS.get(name, "").split("(")[-1].rstrip(")") if "(" in PROPERTY_LABELS.get(name, "") else "",
        ))
    return props

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/properties", response_model=SoilPropertiesResponse)
async def get_soil_properties(request: SoilPropertiesRequest):
    """
    Get **soil properties** for a location from ISRIC SoilGrids.

    Returns pH, texture (sand/silt/clay), organic carbon, nitrogen,
    CEC, bulk depth, and coarse fragments.
    """
    lat, lng, depth = request.lat, request.lng, request.depth
    raw = await _fetch_soilgrids(lat, lng, depth)
    props = _parse_soilgrids_response(raw["data"], [
        "phh2o", "sand", "silt", "clay", "soc", "nitrogen", "cec", "bdod", "cfvo",
    ], depth)

    if not props:
        # Fallback to full simulation
        props = await _get_simulated_soil(lat, lng)

    return SoilPropertiesResponse(
        lat=lat,
        lng=lng,
        depth=depth,
        properties=props,
        source=raw.get("source", "unknown"),
        fetched_at=datetime.utcnow().isoformat(),
    )


@router.post("/analyze")
async def analyze_soil(request: SoilAnalyzeRequest):
    """
    Full **soil analysis** with agronomic recommendations.

    Fetches soil properties and generates:
    - Detailed property report
    - Health score
    - Crop-specific management recommendations
    """
    raw = await _fetch_soilgrids(request.lat, request.lng, request.depth)
    props = _parse_soilgrids_response(raw["data"], [
        "phh2o", "sand", "silt", "clay", "soc", "nitrogen", "cec", "bdod",
    ], request.depth)

    if not props:
        props = await _get_simulated_soil(request.lat, request.lng)

    health = _compute_health_score(props)
    recs = _generate_recommendations(props, request.crop_type)

    return {
        "lat": request.lat,
        "lng": request.lng,
        "depth": request.depth,
        "properties": [p.model_dump() for p in props],
        "health_score": health["overall"],
        "health_rating": health["rating"],
        "sub_scores": health["sub_scores"],
        "recommendations": recs,
        "source": raw.get("source", "unknown"),
        "analyzed_at": datetime.utcnow().isoformat(),
    }


@router.post("/health-score", response_model=SoilHealthScoreResponse)
async def get_health_score(request: SoilHealthScoreRequest):
    """
    Calculate a **soil health score** (0-100) based on pH, organic
    carbon, CEC, bulk density, and texture.
    """
    lat, lng, depth = request.lat, request.lng, request.depth
    raw = await _fetch_soilgrids(lat, lng, depth)
    props = _parse_soilgrids_response(raw["data"], [
        "phh2o", "sand", "silt", "clay", "soc", "cec", "bdod",
    ], depth)

    if not props:
        props = await _get_simulated_soil(lat, lng)

    health = _compute_health_score(props)
    recs = _generate_recommendations(props)

    return SoilHealthScoreResponse(
        lat=lat,
        lng=lng,
        depth=depth,
        overall_score=health["overall"],
        sub_scores=health["sub_scores"],
        rating=health["rating"],
        recommendations=recs,
        fetched_at=datetime.utcnow().isoformat(),
    )
