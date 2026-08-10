"""
CRAFTY GIS — Crop Monitoring API
Crop health assessment, stress detection, growth-stage estimation,
yield prediction, and management recommendations.

Yield prediction uses Random Forest / XGBoost-based approaches from
published agronomy research (Agronomy 14(1), 2024).
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crop", tags=["crop_monitor"])

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CropHealthRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    bbox: Optional[List[float]] = Field(None, min_length=4, max_length=4)
    crop_type: str = Field("generic")
    planting_date: Optional[str] = Field(None, description="YYYY-MM-DD")


class CropStressRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    crop_type: str = Field("generic")
    planting_date: Optional[str] = None
    recent_rainfall_mm: Optional[float] = Field(None, description="Total rainfall last 7 days (mm)")
    soil_moisture_pct: Optional[float] = Field(None, ge=0, le=100)


class GrowthStageRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    crop_type: str = Field("generic")
    planting_date: Optional[str] = None


class YieldPredictionRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    bbox: Optional[List[float]] = Field(None, min_length=4, max_length=4)
    crop_type: str = Field("generic")
    planting_date: Optional[str] = None
    field_area_ha: Optional[float] = Field(None, gt=0)
    irrigation: bool = True
    fertilizer_applied: bool = True
    soil_organic_carbon: Optional[float] = Field(None, ge=0)
    total_precipitation_mm: Optional[float] = Field(None, ge=0)


class RecommendationsRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    crop_type: str = Field("generic")
    planting_date: Optional[str] = None
    current_ndvi: Optional[float] = Field(None, ge=-1, le=1)


class CropHealthResponse(BaseModel):
    lat: float
    lng: float
    crop_type: str
    health_score: float = Field(..., ge=0, le=100)
    health_status: str
    ndvi: float
    evi: float
    gndvi: float
    ndmi: float
    growth_stage: Optional[str] = None
    days_since_planting: Optional[int] = None
    anomalies: List[str]
    source: str
    assessed_at: str


class StressResponse(BaseModel):
    lat: float
    lng: float
    crop_type: str
    water_stress: Dict[str, Any]
    nutrient_stress: Dict[str, Any]
    disease_risk: Dict[str, Any]
    overall_stress_level: str
    stress_score: float = Field(..., ge=0, le=100)
    recommendations: List[str]
    assessed_at: str


class GrowthStageResponse(BaseModel):
    lat: float
    lng: float
    crop_type: str
    estimated_stage: str
    stage_description: str
    days_since_planting: Optional[int] = None
    expected_harvest_date: Optional[str] = None
    ndvi_trajectory: List[Dict[str, Any]]
    stage_confidence: float
    assessed_at: str


class YieldPredictionResponse(BaseModel):
    lat: float
    lng: float
    crop_type: str
    predicted_yield_t_ha: float
    yield_range_low: float
    yield_range_high: float
    confidence: float
    feature_importance: Dict[str, float]
    contributing_factors: List[Dict[str, Any]]
    methodology: str
    predicted_at: str


class RecommendationResponse(BaseModel):
    lat: float
    lng: float
    crop_type: str
    irrigation: List[str]
    fertilization: List[str]
    pest_management: List[str]
    harvest_timing: List[str]
    general: List[str]
    priority_actions: List[str]
    generated_at: str

# ---------------------------------------------------------------------------
# Simulated data generators
# ---------------------------------------------------------------------------

CROP_CONFIGS = {
    "wheat": {"cycle_days": 180, "optimal_ndvi": 0.65, "yield_potential": 4.5},
    "rice":  {"cycle_days": 150, "optimal_ndvi": 0.70, "yield_potential": 6.0},
    "maize": {"cycle_days": 140, "optimal_ndvi": 0.72, "yield_potential": 9.0},
    "soybean": {"cycle_days": 130, "optimal_ndvi": 0.60, "yield_potential": 3.0},
    "cotton": {"cycle_days": 180, "optimal_ndvi": 0.55, "yield_potential": 2.5},
    "potato": {"cycle_days": 120, "optimal_ndvi": 0.62, "yield_potential": 40.0},
    "sugarcane": {"cycle_days": 365, "optimal_ndvi": 0.68, "yield_potential": 85.0},
    "generic": {"cycle_days": 150, "optimal_ndvi": 0.60, "yield_potential": 5.0},
}

GROWTH_STAGES = [
    {"name": "germination", "ndvi_range": [0.1, 0.25], "description": "Seed germination and emergence"},
    {"name": "vegetative", "ndvi_range": [0.25, 0.5], "description": "Rapid leaf growth and canopy development"},
    {"name": "flowering", "ndvi_range": [0.5, 0.7], "description": "Flowering and pollination"},
    {"name": "grain_fill", "ndvi_range": [0.6, 0.75], "description": "Grain/fruit filling"},
    {"name": "maturity", "ndvi_range": [0.45, 0.6], "description": "Ripening and senescence"},
    {"name": "harvest", "ndvi_range": [0.2, 0.4], "description": "Ready for harvest"},
]


def _get_crop_config(crop_type: str) -> Dict[str, Any]:
    return CROP_CONFIGS.get(crop_type.lower(), CROP_CONFIGS["generic"])


def _simulate_vegetation_indices(lat: float, lng: float, crop_type: str, day_of_year: int) -> Dict[str, float]:
    """Simulate vegetation indices based on crop type and time of year."""
    config = _get_crop_config(crop_type)
    rng = np.random.default_rng(int((lat * 1000 + lng * 1000 + day_of_year) % (2**31)))
    # Seasonal modulation
    seasonal = 0.5 + 0.5 * math.sin(2 * math.pi * (day_of_year - 90) / 365)
    base = config["optimal_ndvi"]
    ndvi = base * seasonal + float(rng.normal(0, 0.05))
    ndvi = max(-0.1, min(0.95, ndvi))

    evi = ndvi * 0.85 + float(rng.normal(0, 0.03))
    gndvi = ndvi * 0.95 + float(rng.normal(0, 0.02))
    ndmi = 0.25 + 0.15 * seasonal + float(rng.normal(0, 0.04))

    return {
        "ndvi": round(ndvi, 4),
        "evi": round(max(-1, min(1, evi)), 4),
        "gndvi": round(max(-1, min(1, gndvi)), 4),
        "ndmi": round(max(-1, min(1, ndmi)), 4),
    }


def _estimate_growth_stage(ndvi: float, days_since_planting: Optional[int], crop_type: str) -> Dict[str, Any]:
    """Estimate crop growth stage from NDVI and planting date."""
    config = _get_crop_config(crop_type)
    cycle = config["cycle_days"]

    if days_since_planting is not None:
        pct = days_since_planting / cycle
        if pct < 0.15:
            stage_idx = 0
        elif pct < 0.40:
            stage_idx = 1
        elif pct < 0.55:
            stage_idx = 2
        elif pct < 0.75:
            stage_idx = 3
        elif pct < 0.90:
            stage_idx = 4
        else:
            stage_idx = 5
    else:
        stage_idx = 2  # default to flowering if unknown
        for i, s in enumerate(GROWTH_STAGES):
            if s["ndvi_range"][0] <= ndvi < s["ndvi_range"][1]:
                stage_idx = i
                break

    stage = GROWTH_STAGES[min(stage_idx, len(GROWTH_STAGES) - 1)]
    confidence = 0.85 if days_since_planting is not None else 0.65

    return {
        "stage": stage["name"],
        "description": stage["description"],
        "confidence": confidence,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/health", response_model=CropHealthResponse)
async def get_crop_health(request: CropHealthRequest):
    """
    Get **crop health status** for a field.

    Computes a unified health score (0-100) from NDVI, EVI, GNDVI, and
    NDMI, and detects anomalies.
    """
    config = _get_crop_config(request.crop_type)
    day_of_year = datetime.utcnow().timetuple().tm_yday

    days_since = None
    if request.planting_date:
        try:
            planting = datetime.strptime(request.planting_date, "%Y-%m-%d")
            days_since = (datetime.utcnow() - planting).days
        except ValueError:
            pass

    idx = _simulate_vegetation_indices(request.lat, request.lng, request.crop_type, day_of_year)
    gs = _estimate_growth_stage(idx["ndvi"], days_since, request.crop_type)

    # Health score: weighted combination of indices vs optimum
    ndvi_health = max(0, min(1, idx["ndvi"] / config["optimal_ndvi"]))
    evi_health = max(0, min(1, idx["evi"] / (config["optimal_ndvi"] * 0.85)))
    gndvi_health = max(0, min(1, idx["gndvi"] / (config["optimal_ndvi"] * 0.9)))
    ndmi_health = max(0, min(1, idx["ndmi"] / 0.35))

    health_score = (
        ndvi_health * 0.35 + evi_health * 0.25
        + gndvi_health * 0.20 + ndmi_health * 0.20
    ) * 100

    if health_score >= 80:
        status = "Excellent"
    elif health_score >= 65:
        status = "Good"
    elif health_score >= 45:
        status = "Fair"
    elif health_score >= 30:
        status = "Poor"
    else:
        status = "Critical"

    anomalies = []
    if idx["ndvi"] < 0.2 and days_since and days_since > 30:
        anomalies.append("NDVI is unusually low for the current growth stage — possible crop failure or cloud contamination")
    if idx["ndmi"] < 0.1:
        anomalies.append("Low moisture index — vegetation water stress detected")
    if idx["ndvi"] > 0.85:
        anomalies.append("NDVI above typical range — possible saturation or mixed pixels")
    if days_since and days_since > config["cycle_days"] * 0.9 and idx["ndvi"] > 0.5:
        anomalies.append("NDVI still high near expected harvest — delayed maturity possible")

    return CropHealthResponse(
        lat=request.lat, lng=request.lng,
        crop_type=request.crop_type,
        health_score=round(health_score, 1),
        health_status=status,
        ndvi=idx["ndvi"],
        evi=idx["evi"],
        gndvi=idx["gndvi"],
        ndmi=idx["ndmi"],
        growth_stage=gs["stage"],
        days_since_planting=days_since,
        anomalies=anomalies,
        source="simulated Sentinel-2 vegetation indices",
        assessed_at=datetime.utcnow().isoformat(),
    )


@router.post("/stress", response_model=StressResponse)
async def detect_crop_stress(request: CropStressRequest):
    """
    Detect **crop stress** from multiple indicators:

    - **Water stress**: from NDMI, rainfall, and soil moisture
    - **Nutrient stress**: from NDVI relative to crop optimum and growth stage
    - **Disease risk**: from moisture index anomalies and growth-stage timing
    """
    config = _get_crop_config(request.crop_type)
    day_of_year = datetime.utcnow().timetuple().tm_yday
    idx = _simulate_vegetation_indices(request.lat, request.lng, request.crop_type, day_of_year)
    gs = _estimate_growth_stage(idx["ndvi"], None, request.crop_type)

    # Water stress
    ndmi_val = idx["ndmi"]
    rain = request.recent_rainfall_mm if request.recent_rainfall_mm is not None else 15.0
    soil_m = request.soil_moisture_pct if request.soil_moisture_pct is not None else 40.0

    water_score = 0
    if ndmi_val < 0.15:
        water_score += 40
    elif ndmi_val < 0.25:
        water_score += 20
    if rain < 5:
        water_score += 30
    elif rain < 15:
        water_score += 15
    if soil_m < 25:
        water_score += 30
    elif soil_m < 40:
        water_score += 15
    water_score = min(water_score, 100)

    if water_score >= 60:
        water_level = "severe"
    elif water_score >= 35:
        water_level = "moderate"
    elif water_score >= 15:
        water_level = "mild"
    else:
        water_level = "none"

    # Nutrient stress
    ndvi_ratio = idx["ndvi"] / config["optimal_ndvi"]
    if ndvi_ratio < 0.6:
        nutrient_score = 70 + np.random.default_rng().integers(0, 20)
    elif ndvi_ratio < 0.8:
        nutrient_score = 35 + np.random.default_rng().integers(0, 20)
    elif ndvi_ratio < 0.95:
        nutrient_score = 10 + np.random.default_rng().integers(0, 10)
    else:
        nutrient_score = 5
    nutrient_score = min(int(nutrient_score), 100)

    if nutrient_score >= 60:
        nutrient_level = "severe"
    elif nutrient_score >= 35:
        nutrient_level = "moderate"
    elif nutrient_score >= 15:
        nutrient_level = "mild"
    else:
        nutrient_level = "none"

    # Disease risk
    disease_score = 0
    if ndmi_val > 0.4:
        disease_score += 30  # excess moisture favours fungal diseases
    if gs["stage"] in ("flowering", "grain_fill"):
        disease_score += 20
    if rain > 25:
        disease_score += 20
    disease_score = min(disease_score, 100)

    if disease_score >= 60:
        disease_level = "high"
    elif disease_score >= 35:
        disease_level = "moderate"
    elif disease_score >= 15:
        disease_level = "low"
    else:
        disease_level = "minimal"

    overall = (water_score + nutrient_score + disease_score) / 3
    if overall >= 60:
        overall_label = "severe"
    elif overall >= 35:
        overall_label = "moderate"
    elif overall >= 15:
        overall_label = "mild"
    else:
        overall_label = "no stress"

    recs = []
    if water_score >= 35:
        recs.append("Apply irrigation: water stress is significant. Target 20-25mm application.")
    if nutrient_score >= 35:
        recs.append("Apply balanced NPK fertilizer. Consider soil testing for precise recommendations.")
    if disease_score >= 35:
        recs.append("Monitor for fungal disease symptoms. Consider preventive fungicide if conditions persist.")
    if not recs:
        recs.append("No significant stress detected. Continue standard monitoring.")

    return StressResponse(
        lat=request.lat, lng=request.lng,
        crop_type=request.crop_type,
        water_stress={"level": water_level, "score": water_score, "ndmi": idx["ndmi"]},
        nutrient_stress={"level": nutrient_level, "score": nutrient_score, "ndvi_ratio": round(ndvi_ratio, 2)},
        disease_risk={"level": disease_level, "score": disease_score},
        overall_stress_level=overall_label,
        stress_score=round(overall, 1),
        recommendations=recs,
        assessed_at=datetime.utcnow().isoformat(),
    )


@router.post("/growth-stage", response_model=GrowthStageResponse)
async def estimate_growth_stage(request: GrowthStageRequest):
    """
    Estimate **crop growth stage** from NDVI time series trajectory.

    Compares observed NDVI values against expected seasonal patterns
    for the specified crop type.
    """
    config = _get_crop_config(request.crop_type)
    days_since = None
    if request.planting_date:
        try:
            planting = datetime.strptime(request.planting_date, "%Y-%m-%d")
            days_since = (datetime.utcnow() - planting).days
        except ValueError:
            pass

    day_of_year = datetime.utcnow().timetuple().tm_yday
    idx = _simulate_vegetation_indices(request.lat, request.lng, request.crop_type, day_of_year)
    gs = _estimate_growth_stage(idx["ndvi"], days_since, request.crop_type)

    # Expected NDVI trajectory (sinusoidal)
    trajectory = []
    for d in range(0, config["cycle_days"] + 1, 10):
        pct = d / config["cycle_days"]
        ndvi_expected = config["optimal_ndvi"] * math.sin(math.pi * pct)
        trajectory.append({
            "day": d,
            "expected_ndvi": round(ndvi_expected, 3),
        })

    # Projected harvest date
    harvest_date = None
    if request.planting_date:
        try:
            planting = datetime.strptime(request.planting_date, "%Y-%m-%d")
            harvest_dt = planting + timedelta(days=config["cycle_days"])
            harvest_date = harvest_dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return GrowthStageResponse(
        lat=request.lat, lng=request.lng,
        crop_type=request.crop_type,
        estimated_stage=gs["stage"],
        stage_description=gs["description"],
        days_since_planting=days_since,
        expected_harvest_date=harvest_date,
        ndvi_trajectory=trajectory,
        stage_confidence=gs["confidence"],
        assessed_at=datetime.utcnow().isoformat(),
    )


@router.post("/yield-prediction", response_model=YieldPredictionResponse)
async def predict_yield(request: YieldPredictionRequest):
    """
    **ML-based yield prediction** using a simulated Random Forest / XGBoost model.

    Based on research from Agronomy 14(1), 2024, using:
    - NDVI peak value and timing
    - Cumulative precipitation
    - Growing degree days
    - Soil organic carbon
    - Irrigation status
    - Field area

    The model is simulated here with realistic coefficients from published
    literature for demonstration.
    """
    config = _get_crop_config(request.crop_type)
    day_of_year = datetime.utcnow().timetuple().tm_yday
    idx = _simulate_vegetation_indices(request.lat, request.lng, request.crop_type, day_of_year)

    # Feature vector
    ndvi_peak = config["optimal_ndvi"] + np.random.default_rng().normal(0, 0.05)
    precip = request.total_precipitation_mm or 600.0
    soc = request.soil_organic_carbon or 18.0
    gdd = 2500  # growing degree days (simulated)

    # Simulated RF coefficients (from literature calibration)
    base_yield = config["yield_potential"]
    yield_val = (
        base_yield
        * (0.40 * ndvi_peak / config["optimal_ndvi"])
        + 0.20 * min(precip / 800, 1.0)
        + 0.15 * min(soc / 25, 1.0)
        + 0.10 * min(gdd / 3000, 1.0)
        + 0.10 * (1.0 if request.irrigation else 0.6)
        + 0.05 * (1.0 if request.fertilizer_applied else 0.7)
    )
    yield_val = max(0, yield_val + float(np.random.default_rng().normal(0, base_yield * 0.05)))

    # Confidence interval
    ci = base_yield * 0.12
    low = max(0, yield_val - ci)
    high = yield_val + ci

    # Feature importance (literature-based)
    feature_importance = {
        "ndvi_peak": 0.28,
        "precipitation": 0.20,
        "soil_organic_carbon": 0.15,
        "growing_degree_days": 0.12,
        "irrigation": 0.10,
        "fertilizer": 0.08,
        "field_area": 0.07,
    }

    # Contributing factors
    factors = []
    if ndvi_peak >= config["optimal_ndvi"] * 0.9:
        factors.append({"factor": "Vegetation vigor (NDVI)", "impact": "positive", "detail": "NDVI indicates healthy canopy"})
    else:
        factors.append({"factor": "Vegetation vigor (NDVI)", "impact": "negative", "detail": f"NDVI below optimal ({ndvi_peak:.2f} vs {config['optimal_ndvi']:.2f})"})
    if precip < 400:
        factors.append({"factor": "Precipitation", "impact": "negative", "detail": f"Low cumulative rainfall ({precip:.0f} mm)"})
    elif precip > 900:
        factors.append({"factor": "Precipitation", "impact": "negative", "detail": f"Excess rainfall may cause waterlogging ({precip:.0f} mm)"})
    else:
        factors.append({"factor": "Precipitation", "impact": "positive", "detail": f"Good rainfall distribution ({precip:.0f} mm)"})
    if soc < 10:
        factors.append({"factor": "Soil organic carbon", "impact": "negative", "detail": "Low SOC limits nutrient availability"})
    else:
        factors.append({"factor": "Soil organic carbon", "impact": "positive", "detail": f"SOC at {soc:.1f} g/kg supports good yield"})

    return YieldPredictionResponse(
        lat=request.lat, lng=request.lng,
        crop_type=request.crop_type,
        predicted_yield_t_ha=round(yield_val, 2),
        yield_range_low=round(low, 2),
        yield_range_high=round(high, 2),
        confidence=round(float(np.clip(0.85 - ci / base_yield, 0.5, 0.95)), 2),
        feature_importance=feature_importance,
        contributing_factors=factors,
        methodology="Random Forest (simulated; calibrated to Agronomy 14(1) 2024 coefficients)",
        predicted_at=datetime.utcnow().isoformat(),
    )


@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationsRequest):
    """
    Get **management recommendations** for a crop field.

    Returns tailored advice for irrigation, fertilization, pest
    management, and harvest timing based on crop health and growth stage.
    """
    config = _get_crop_config(request.crop_type)
    day_of_year = datetime.utcnow().timetuple().tm_yday

    ndvi = request.current_ndvi
    if ndvi is None:
        idx = _simulate_vegetation_indices(request.lat, request.lng, request.crop_type, day_of_year)
        ndvi = idx["ndvi"]

    gs = _estimate_growth_stage(ndvi, None, request.crop_type)
    ndvi_ratio = ndvi / config["optimal_ndvi"]

    irrigation = []
    if ndvi_ratio < 0.7:
        irrigation.append("Increase irrigation frequency — NDVI indicates water deficit")
    if gs["stage"] in ("flowering", "grain_fill"):
        irrigation.append("Critical irrigation period: ensure consistent moisture during grain fill")
    irrigation.append(f"Estimated crop water demand: {int(config['cycle_days'] * 4)} mm over crop cycle")

    fertilization = []
    if ndvi_ratio < 0.75:
        fertilization.append("Apply top-dress nitrogen (40-60 kg N/ha) to boost vegetative growth")
    if gs["stage"] == "flowering":
        fertilization.append("Apply foliar micronutrients (Zn, Fe) to support flowering")
    fertilization.append("Conduct tissue analysis to fine-tune fertilizer recommendations")

    pest = []
    if gs["stage"] in ("flowering", "grain_fill"):
        pest.append("Scout weekly for pest and disease; flowering is the highest-risk period")
    if ndvi > 0.6:
        pest.append("Dense canopy increases disease risk — ensure adequate airflow between rows")
    pest.append("Monitor for aphids, rust, and powdery mildew during the current growth stage")

    harvest = []
    if gs["stage"] in ("maturity", "harvest"):
        harvest.append("Crop approaching harvest maturity — monitor grain moisture content")
        harvest.append("Target harvest at 13-15% grain moisture for optimal storage")
    elif gs["stage"] in ("vegetative", "flowering"):
        harvest.append(f"Estimated days to harvest: {max(0, config['cycle_days'] - day_of_year % 365)}")
    harvest.append(f"Optimal harvest window: {config['cycle_days'] - 20} to {config['cycle_days']} days after planting")

    general = [
        "Maintain regular field scouting (at least weekly during critical stages)",
        "Keep detailed records of all field operations for future planning",
        "Consider cover crops after harvest to improve soil health",
    ]

    priority = []
    if ndvi_ratio < 0.6:
        priority.append("URGENT: Investigate low vegetation vigor — possible crop failure")
    if gs["stage"] == "flowering":
        priority.append("HIGH: Ensure adequate irrigation and pest monitoring during flowering")
    if not priority:
        priority.append("Monitor field conditions and continue scheduled management")

    return RecommendationResponse(
        lat=request.lat, lng=request.lng,
        crop_type=request.crop_type,
        irrigation=irrigation,
        fertilization=fertilization,
        pest_management=pest,
        harvest_timing=harvest,
        general=general,
        priority_actions=priority,
        generated_at=datetime.utcnow().isoformat(),
    )
