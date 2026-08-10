"""
CRAFTY GIS — Weather Data API
Current, forecast, and historical weather from Open-Meteo (free, no key required).
Includes FAO-56 Penman-Monteith reference evapotranspiration (ET0) and
crop coefficients (Kc) for major crops at different growth stages.

Open-Meteo docs: https://open-meteo.com/en/docs
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/weather", tags=["weather"])

OPEN_METEO_BASE = "https://api.open-meteo.com/v1"

# ---------------------------------------------------------------------------
# Crop coefficient (Kc) tables — FAO-56 Irrigation and Drainage Paper 56
# Kc values for major crops at different growth stages
# ---------------------------------------------------------------------------
CROP_COEFFICIENTS: Dict[str, Dict[str, Any]] = {
    "wheat": {
        "name": "Wheat (Winter/Spring)",
        "stages": {
            "initial": {"kc": 0.4, "days": [0, 30], "description": "Germination to 10% ground cover"},
            "development": {"kc": 0.75, "days": [30, 90], "description": "10% to effective full cover"},
            "mid_season": {"kc": 1.15, "days": [90, 140], "description": "Full cover to start of grain fill"},
            "late_season": {"kc": 0.4, "days": [140, 180], "description": "Grain fill to maturity/harvest"},
        },
    },
    "rice": {
        "name": "Rice (Paddy)",
        "stages": {
            "initial": {"kc": 1.05, "days": [0, 30], "description": "Transplanting to tillering"},
            "development": {"kc": 1.20, "days": [30, 70], "description": "Tillering to panicle initiation"},
            "mid_season": {"kc": 1.20, "days": [70, 110], "description": "Panicle initiation to heading"},
            "late_season": {"kc": 0.90, "days": [110, 150], "description": "Heading to maturity"},
        },
    },
    "maize": {
        "name": "Maize (Corn)",
        "stages": {
            "initial": {"kc": 0.3, "days": [0, 25], "description": "Germination to emergence"},
            "development": {"kc": 0.75, "days": [25, 60], "description": "Emergence to mid-season"},
            "mid_season": {"kc": 1.20, "days": [60, 100], "description": "Tasseling to grain fill"},
            "late_season": {"kc": 0.60, "days": [100, 140], "description": "Grain fill to physiological maturity"},
        },
    },
    "soybean": {
        "name": "Soybean",
        "stages": {
            "initial": {"kc": 0.35, "days": [0, 20], "description": "Planting to emergence"},
            "development": {"kc": 0.75, "days": [20, 45], "description": "Emergence to bloom"},
            "mid_season": {"kc": 1.15, "days": [45, 90], "description": "Bloom to start of pod fill"},
            "late_season": {"kc": 0.50, "days": [90, 130], "description": "Pod fill to maturity"},
        },
    },
    "cotton": {
        "name": "Cotton",
        "stages": {
            "initial": {"kc": 0.35, "days": [0, 30], "description": "Planting to emergence"},
            "development": {"kc": 0.75, "days": [30, 70], "description": "Emergence to effective full cover"},
            "mid_season": {"kc": 1.20, "days": [70, 130], "description": "Full cover to first boll open"},
            "late_season": {"kc": 0.70, "days": [130, 180], "description": "Boll opening to harvest"},
        },
    },
    "potato": {
        "name": "Potato",
        "stages": {
            "initial": {"kc": 0.50, "days": [0, 25], "description": "Planting to emergence"},
            "development": {"kc": 0.75, "days": [25, 45], "description": "Emergence to mid-season"},
            "mid_season": {"kc": 1.15, "days": [45, 80], "description": "Full cover to start of tuber bulking"},
            "late_season": {"kc": 0.75, "days": [80, 120], "description": "Tuber bulking to senescence"},
        },
    },
    "sugarcane": {
        "name": "Sugarcane",
        "stages": {
            "initial": {"kc": 0.40, "days": [0, 60], "description": "Planting to 10% ground cover"},
            "development": {"kc": 0.80, "days": [60, 150], "description": "10% to effective full cover"},
            "mid_season": {"kc": 1.25, "days": [150, 300], "description": "Full cover to harvest"},
            "late_season": {"kc": 0.80, "days": [300, 365], "description": "Senescence / post-harvest regrowth"},
        },
    },
    "generic": {
        "name": "Generic Crop",
        "stages": {
            "initial": {"kc": 0.40, "days": [0, 30], "description": "Germination and establishment"},
            "development": {"kc": 0.75, "days": [30, 70], "description": "Vegetative growth"},
            "mid_season": {"kc": 1.15, "days": [70, 120], "description": "Flowering and fruit set"},
            "late_season": {"kc": 0.55, "days": [120, 160], "description": "Ripening and harvest"},
        },
    },
}

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class WeatherRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class CurrentWeatherResponse(BaseModel):
    lat: float
    lng: float
    temperature_c: float
    humidity_pct: float
    wind_speed_ms: float
    wind_direction_deg: float
    pressure_hpa: float
    precipitation_mm: float
    cloud_cover_pct: float
    description: str
    source: str
    fetched_at: str


class ForecastDay(BaseModel):
    date: str
    temp_max_c: float
    temp_min_c: float
    precip_mm: float
    humidity_pct: float
    wind_speed_ms: float
    et0_mm: float
    description: str


class ForecastResponse(BaseModel):
    lat: float
    lng: float
    timezone: str
    days: List[ForecastDay]
    source: str
    fetched_at: str


class HistoricalDay(BaseModel):
    date: str
    temp_max_c: float
    temp_min_c: float
    precip_mm: float
    et0_mm: float


class HistoricalResponse(BaseModel):
    lat: float
    lng: float
    start_date: str
    end_date: str
    days: List[HistoricalDay]
    summary: Dict[str, float]
    source: str
    fetched_at: str


class ET0Response(BaseModel):
    lat: float
    lng: float
    et0_mm_per_day: float
    method: str
    temperature_c: float
    humidity_pct: float
    wind_speed_ms: float
    solar_radiation_mj: float
    fetched_at: str


class CropCoefficientResponse(BaseModel):
    crop_type: str
    crop_name: str
    stages: Dict[str, Dict[str, Any]]
    current_stage: Optional[str] = None
    current_kc: Optional[float] = None

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _fetch_open_meteo(
    lat: float, lng: float, params: Dict[str, Any]
) -> Dict[str, Any]:
    """Call the Open-Meteo API and return the JSON payload."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{OPEN_METEO_BASE}/forecast", params={
                "latitude": lat,
                "longitude": lng,
                **params,
            })
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as exc:
        logger.warning("Open-Meteo request failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"Open-Meteo API error: {exc}",
        )
    except Exception as exc:
        logger.warning("Weather API error: %s", exc)
        raise HTTPException(status_code=502, detail=f"Weather service unavailable: {exc}")


def _wmo_weather_code_to_desc(code: int) -> str:
    """Convert WMO weather code to human-readable description."""
    wmo = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
        80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
        95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm",
    }
    return wmo.get(code, f"WMO code {code}")


def _compute_fao56_et0(
    t_max: float, t_min: float, humidity: float,
    wind_speed: float, solar_radiation: float,
    elevation: float = 0.0, lat_rad: float = 0.0,
    day_of_year: int = 1,
) -> float:
    """
    Compute reference evapotranspiration (ET0) using the
    FAO-56 Penman-Monteith equation.

    All inputs in metric units:
        t_max, t_min    : daily max/min temperature (C)
        humidity         : mean relative humidity (%)
        wind_speed       : 2m wind speed (m/s)
        solar_radiation  : solar radiation (MJ/m2/day)
        elevation        : station elevation (m)
        lat_rad          : latitude in radians
        day_of_year      : day of year (1-365)

    Returns ET0 in mm/day.
    """
    t_mean = (t_max + t_min) / 2.0
    # Atmospheric pressure (kPa)
    p = 101.3 * ((293 - 0.0065 * elevation) / 293) ** 5.26
    # Psychrometric constant (kPa/C)
    gamma = 0.000665 * p

    # Saturation vapour pressure (kPa)
    es_tmax = 0.6108 * math.exp(17.27 * t_max / (t_max + 237.3))
    es_tmin = 0.6108 * math.exp(17.27 * t_min / (t_min + 237.3))
    es = (es_tmax + es_tmin) / 2.0
    ea = es * humidity / 100.0

    # Inverse relative distance Earth-Sun
    dr = 1 + 0.033 * math.cos(2 * math.pi * day_of_year / 365)
    # Solar declination
    delta = 0.409 * math.sin(2 * math.pi * day_of_year / 365 - 1.39)
    # Sunset hour angle
    ws = math.acos(-math.tan(lat_rad) * math.tan(delta))
    # Extraterrestrial radiation (MJ/m2/day)
    ra = 24 * 60 / math.pi * 0.0820 * dr * (
        ws * math.sin(lat_rad) * math.sin(delta)
        + math.cos(lat_rad) * math.cos(delta) * math.sin(ws)
    )
    # Clear-sky solar radiation
    rso = (0.75 + 2e-5 * elevation) * ra
    rso = max(rso, 0.01)
    # Net solar radiation
    rns = (1 - 0.23) * solar_radiation
    rnl = 4.903e-9 * ((t_max + 273.16) ** 4 + (t_min + 273.16) ** 4) / 2.0 * (
        0.34 - 0.14 * math.sqrt(max(ea, 0.01))
    ) * (1.35 * min(solar_radiation / rso, 1.0) - 0.35)
    rn = rns - rnl

    # Soil heat flux (negligible for daily)
    g = 0.0

    # FAO-56 PM equation
    numerator = 0.408 * delta * (rn - g) + gamma * 900 / (t_mean + 273) * wind_speed * (es - ea)
    denominator = delta + gamma * (1 + 0.34 * wind_speed)
    et0 = numerator / denominator

    return max(et0, 0.0)


def _generate_simulated_daily(
    lat: float, lng: float, date: str, rng: np.random.Generator,
) -> Dict[str, float]:
    """Generate simulated daily weather data."""
    doy = datetime.strptime(date, "%Y-%m-%d").timetuple().tm_yday
    # Seasonal temperature modulation
    base_temp = 15 + 15 * math.sin(2 * math.pi * (doy - 80) / 365)
    t_max = base_temp + float(rng.uniform(3, 8))
    t_min = base_temp - float(rng.uniform(3, 7))
    humidity = float(rng.uniform(40, 85))
    wind_speed = float(rng.uniform(1, 6))
    precip = float(rng.choice([0, 0, 0, 0, 0, 0.5, 2, 5, 15]))
    solar = float(rng.uniform(10, 25))
    cloud = float(rng.uniform(0, 80))

    return {
        "temp_max": round(t_max, 1),
        "temp_min": round(t_min, 1),
        "humidity": round(humidity, 1),
        "wind_speed": round(wind_speed, 1),
        "precip": round(precip, 1),
        "solar_radiation": round(solar, 1),
        "cloud_cover": round(cloud, 0),
        "weather_code": 0 if cloud < 25 else 3 if cloud < 75 else 61,
    }

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/current", response_model=CurrentWeatherResponse)
async def get_current_weather(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    """
    Get **current weather** for a location from Open-Meteo.

    Returns temperature, humidity, wind, pressure, precipitation,
    and cloud cover.
    """
    try:
        data = await _fetch_open_meteo(lat, lng, {
            "current": (
                "temperature_2m,relative_humidity_2m,wind_speed_10m,"
                "wind_direction_10m,surface_pressure,precipitation,"
                "cloud_cover,weather_code"
            ),
        })
        c = data.get("current", {})
        return CurrentWeatherResponse(
            lat=lat, lng=lng,
            temperature_c=c.get("temperature_2m", 0),
            humidity_pct=c.get("relative_humidity_2m", 0),
            wind_speed_ms=c.get("wind_speed_10m", 0),
            wind_direction_deg=c.get("wind_direction_10m", 0),
            pressure_hpa=c.get("surface_pressure", 0),
            precipitation_mm=c.get("precipitation", 0),
            cloud_cover_pct=c.get("cloud_cover", 0),
            description=_wmo_weather_code_to_desc(c.get("weather_code", 0)),
            source="Open-Meteo",
            fetched_at=datetime.utcnow().isoformat(),
        )
    except HTTPException:
        # Fallback to simulated data
        rng = np.random.default_rng(int((lat * 1000 + lng * 1000) % (2**31)))
        now = datetime.utcnow()
        sim = _generate_simulated_daily(lat, lng, now.strftime("%Y-%m-%d"), rng)
        return CurrentWeatherResponse(
            lat=lat, lng=lng,
            temperature_c=sim["temp_max"],
            humidity_pct=sim["humidity"],
            wind_speed_ms=sim["wind_speed"],
            wind_direction_deg=float(rng.uniform(0, 360)),
            pressure_hpa=1013.25,
            precipitation_mm=sim["precip"],
            cloud_cover_pct=sim["cloud_cover"],
            description=_wmo_weather_code_to_desc(sim["weather_code"]),
            source="simulated (Open-Meteo unreachable)",
            fetched_at=datetime.utcnow().isoformat(),
        )


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    days: int = Query(7, ge=1, le=16, description="Number of forecast days (max 16)"),
):
    """
    Get a **multi-day weather forecast** from Open-Meteo.

    Includes daily max/min temperature, precipitation, humidity,
    wind speed, and computed ET0 for irrigation planning.
    """
    try:
        data = await _fetch_open_meteo(lat, lng, {
            "daily": (
                "temperature_2m_max,temperature_2m_min,precipitation_sum,"
                "relative_humidity_2m_mean,wind_speed_10m_max,weather_code,"
                "et0_fao56"
            ),
            "forecast_days": str(days),
        })
        daily = data.get("daily", {})
        n = len(daily.get("time", []))

        forecast_days = []
        for i in range(n):
            # Compute our own ET0 if not provided by API
            et0_api = daily.get("et0_fao56", [None] * n)[i]
            if et0_api is None:
                et0_val = _compute_fao56_et0(
                    daily["temperature_2m_max"][i],
                    daily["temperature_2m_min"][i],
                    daily.get("relative_humidity_2m_mean", [60] * n)[i] or 60,
                    daily.get("wind_speed_10m_max", [3] * n)[i] or 3,
                    18.0,  # default solar radiation MJ/m2/day
                    0.0,
                    math.radians(lat),
                    datetime.strptime(daily["time"][i], "%Y-%m-%d").timetuple().tm_yday,
                )
            else:
                et0_val = et0_api

            forecast_days.append(ForecastDay(
                date=daily["time"][i],
                temp_max_c=daily["temperature_2m_max"][i],
                temp_min_c=daily["temperature_2m_min"][i],
                precip_mm=daily["precipitation_sum"][i] or 0,
                humidity_pct=daily.get("relative_humidity_2m_mean", [60] * n)[i] or 60,
                wind_speed_ms=daily.get("wind_speed_10m_max", [3] * n)[i] or 3,
                et0_mm=round(et0_val, 2),
                description=_wmo_weather_code_to_desc(daily.get("weather_code", [0] * n)[i] or 0),
            ))

        return ForecastResponse(
            lat=lat, lng=lng,
            timezone=data.get("timezone", "UTC"),
            days=forecast_days,
            source="Open-Meteo",
            fetched_at=datetime.utcnow().isoformat(),
        )
    except HTTPException:
        rng = np.random.default_rng(int((lat * 1000 + lng * 1000) % (2**31)))
        today = datetime.utcnow()
        forecast_days = []
        for d in range(days):
            date_str = (today + timedelta(days=d)).strftime("%Y-%m-%d")
            sim = _generate_simulated_daily(lat, lng, date_str, rng)
            t_mean = (sim["temp_max"] + sim["temp_min"]) / 2
            et0 = _compute_fao56_et0(
                sim["temp_max"], sim["temp_min"], sim["humidity"],
                sim["wind_speed"], sim["solar_radiation"],
                0.0, math.radians(lat),
                (today + timedelta(days=d)).timetuple().tm_yday,
            )
            forecast_days.append(ForecastDay(
                date=date_str,
                temp_max_c=sim["temp_max"],
                temp_min_c=sim["temp_min"],
                precip_mm=sim["precip"],
                humidity_pct=sim["humidity"],
                wind_speed_ms=sim["wind_speed"],
                et0_mm=round(et0, 2),
                description=_wmo_weather_code_to_desc(sim["weather_code"]),
            ))
        return ForecastResponse(
            lat=lat, lng=lng, timezone="UTC",
            days=forecast_days,
            source="simulated (Open-Meteo unreachable)",
            fetched_at=datetime.utcnow().isoformat(),
        )


@router.get("/historical", response_model=HistoricalResponse)
async def get_historical_weather(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
):
    """
    Get **historical weather data** from Open-Meteo archive.

    Returns daily temperature, precipitation, and ET0 for the requested
    date range along with summary statistics.
    """
    try:
        data = await _fetch_open_meteo(lat, lng, {
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao56",
            "start_date": start_date,
            "end_date": end_date,
        })
        daily = data.get("daily", {})
        n = len(daily.get("time", []))

        hist_days = []
        temps_max, temps_min, precips, ets = [], [], [], []
        for i in range(n):
            t_max = daily["temperature_2m_max"][i] or 0
            t_min = daily["temperature_2m_min"][i] or 0
            prec = daily["precipitation_sum"][i] or 0
            et0 = daily.get("et0_fao56", [0] * n)[i] or 0
            hist_days.append(HistoricalDay(
                date=daily["time"][i],
                temp_max_c=t_max, temp_min_c=t_min,
                precip_mm=prec, et0_mm=round(et0, 2),
            ))
            temps_max.append(t_max)
            temps_min.append(t_min)
            precips.append(prec)
            ets.append(et0)

        summary = {
            "mean_temp_max": round(float(np.mean(temps_max)), 1),
            "mean_temp_min": round(float(np.mean(temps_min)), 1),
            "total_precip_mm": round(float(np.sum(precips)), 1),
            "mean_daily_et0": round(float(np.mean(ets)), 2),
            "total_et0_mm": round(float(np.sum(ets)), 1),
            "num_days": n,
        }

        return HistoricalResponse(
            lat=lat, lng=lng,
            start_date=start_date, end_date=end_date,
            days=hist_days, summary=summary,
            source="Open-Meteo",
            fetched_at=datetime.utcnow().isoformat(),
        )
    except HTTPException:
        # Simulate
        rng = np.random.default_rng(int((lat * 1000 + lng * 1000) % (2**31)))
        try:
            d_start = datetime.strptime(start_date, "%Y-%m-%d")
            d_end = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

        hist_days = []
        temps_max, temps_min, precips, ets = [], [], [], []
        current = d_start
        while current <= d_end:
            ds = current.strftime("%Y-%m-%d")
            sim = _generate_simulated_daily(lat, lng, ds, rng)
            et0 = _compute_fao56_et0(
                sim["temp_max"], sim["temp_min"], sim["humidity"],
                sim["wind_speed"], sim["solar_radiation"],
                0.0, math.radians(lat), current.timetuple().tm_yday,
            )
            hist_days.append(HistoricalDay(
                date=ds, temp_max_c=sim["temp_max"],
                temp_min_c=sim["temp_min"],
                precip_mm=sim["precip"],
                et0_mm=round(et0, 2),
            ))
            temps_max.append(sim["temp_max"])
            temps_min.append(sim["temp_min"])
            precips.append(sim["precip"])
            ets.append(et0)
            current += timedelta(days=1)

        summary = {
            "mean_temp_max": round(float(np.mean(temps_max)), 1),
            "mean_temp_min": round(float(np.mean(temps_min)), 1),
            "total_precip_mm": round(float(np.sum(precips)), 1),
            "mean_daily_et0": round(float(np.mean(ets)), 2),
            "total_et0_mm": round(float(np.sum(ets)), 1),
            "num_days": len(hist_days),
        }

        return HistoricalResponse(
            lat=lat, lng=lng,
            start_date=start_date, end_date=end_date,
            days=hist_days, summary=summary,
            source="simulated (Open-Meteo unreachable)",
            fetched_at=datetime.utcnow().isoformat(),
        )


@router.get("/et0", response_model=ET0Response)
async def get_et0(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    """
    Compute **reference evapotranspiration (ET0)** using the
    FAO-56 Penman-Monteith equation.

    Fetches current weather data and applies the standard PM formula.
    """
    try:
        data = await _fetch_open_meteo(lat, lng, {
            "current": (
                "temperature_2m,relative_humidity_2m,wind_speed_10m,"
                "solar_radiation"
            ),
        })
        c = data.get("current", {})
        t_max = c.get("temperature_2m", 25) + 4
        t_min = c.get("temperature_2m", 25) - 4
        humidity = c.get("relative_humidity_2m", 60)
        wind = c.get("wind_speed_10m", 2)
        solar = c.get("solar_radiation", 18)

        et0 = _compute_fao56_et0(
            t_max, t_min, humidity, wind, solar,
            0.0, math.radians(lat),
            datetime.utcnow().timetuple().tm_yday,
        )
        source = "Open-Meteo + FAO-56 PM"
    except HTTPException:
        rng = np.random.default_rng(int((lat * 1000 + lng * 1000) % (2**31)))
        t_mean = 15 + 15 * math.sin(2 * math.pi * (datetime.utcnow().timetuple().tm_yday - 80) / 365)
        t_max = t_mean + 5
        t_min = t_mean - 5
        humidity = float(rng.uniform(45, 80))
        wind = float(rng.uniform(1.5, 4.0))
        solar = float(rng.uniform(14, 22))
        et0 = _compute_fao56_et0(
            t_max, t_min, humidity, wind, solar,
            0.0, math.radians(lat),
            datetime.utcnow().timetuple().tm_yday,
        )
        source = "FAO-56 PM (simulated weather)"

    return ET0Response(
        lat=lat, lng=lng,
        et0_mm_per_day=round(et0, 2),
        method="FAO-56 Penman-Monteith",
        temperature_c=round((t_max + t_min) / 2, 1),
        humidity_pct=round(humidity, 1),
        wind_speed_ms=round(wind, 1),
        solar_radiation_mj=round(solar, 1),
        fetched_at=datetime.utcnow().isoformat(),
    )


@router.get("/crop-coefficients", response_model=CropCoefficientResponse)
async def get_crop_coefficients(
    crop_type: str = Query("generic", description="Crop type: wheat, rice, maize, soybean, cotton, potato, sugarcane, generic"),
    days_after_planting: Optional[int] = Query(None, ge=0, description="Days after planting to get the current Kc"),
):
    """
    Get **crop coefficients (Kc)** for a specified crop type.

    Returns Kc values for each growth stage according to FAO-56.
    If `days_after_planting` is provided, also returns the current
    Kc for that growth stage.
    """
    crop = CROP_COEFFICIENTS.get(crop_type.lower())
    if not crop:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown crop '{crop_type}'. Available: {', '.join(CROP_COEFFICIENTS.keys())}",
        )

    current_stage = None
    current_kc = None
    if days_after_planting is not None:
        for stage_name, stage_info in crop["stages"].items():
            if stage_info["days"][0] <= days_after_planting < stage_info["days"][1]:
                current_stage = stage_name
                current_kc = stage_info["kc"]
                break
        if current_stage is None:
            # Past all defined stages
            last_stage = list(crop["stages"].values())[-1]
            current_stage = "harvested"
            current_kc = last_stage["kc"]

    return CropCoefficientResponse(
        crop_type=crop_type.lower(),
        crop_name=crop["name"],
        stages=crop["stages"],
        current_stage=current_stage,
        current_kc=current_kc,
    )
