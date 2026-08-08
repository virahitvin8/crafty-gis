"""
LandGPS Earth Engine backend.

Computes crop-health vegetation indices (NDVI, NDRE, EVI, SAVI) for a land
boundary polygon using Sentinel-2 imagery via Google Earth Engine, and returns
summary statistics plus a colour-mapped NDVI thumbnail for the plot.

Run (with credentials):
    pip install -r requirements.txt
    export GOOGLE_CLOUD_PROJECT=your-ee-project
    export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
    uvicorn main:app --host 0.0.0.0 --port 8000

Run without credentials (demo mode - returns plausible synthetic results):
    export DEMO_MODE=1
    uvicorn main:app --host 0.0.0.0 --port 8000
"""

import base64
import io
import os
import random
from datetime import datetime, timezone

import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DEMO_MODE = os.environ.get("DEMO_MODE", "0") == "1"

app = FastAPI(title="LandGPS Earth Engine API")

# The Flutter app may run on an emulator or device - allow all origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    polygon: dict = Field(..., description="GeoJSON Polygon geometry")
    start_date: str = Field(..., description="YYYY-MM-DD")
    end_date: str = Field(..., description="YYYY-MM-DD")


# ---------------------------------------------------------------------------
# Google Earth Engine integration (lazy init so demo mode needs no install)
# ---------------------------------------------------------------------------
_ee = None


def _get_ee():
    """Initialise the Earth Engine client once, raising if unavailable."""
    global _ee
    if _ee is not None:
        return _ee
    try:
        import ee
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "earthengine-api is not installed. Run: pip install -r requirements.txt"
        ) from exc

    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if project:
        ee.Initialize(project=project, opt_url="https://earthengine.googleapis.com")
    elif credentials_path:
        from oauth2client.service_account import ServiceAccountCredentials

        creds = ServiceAccountCredentials.from_service_account_file(credentials_path)
        ee.Initialize(credentials=creds)
    else:
        try:
            ee.Initialize()
        except Exception:
            raise RuntimeError(
                "Earth Engine is not initialised. Set GOOGLE_CLOUD_PROJECT or "
                "GOOGLE_APPLICATION_CREDENTIALS, or run with DEMO_MODE=1."
            )
    _ee = ee
    return ee


# Index definitions: (code, name, band expression on Sentinel-2 SR).
INDICES = {
    "NDVI": (("B8", "B4"), "Normalized Difference Vegetation Index"),
    "NDRE": (("B8", "B5"), "Red-Edge NDVI (chlorophyll)"),
    "EVI": (
        None,
        "Enhanced Vegetation Index",
    ),  # computed via expression, see below
    "SAVI": (
        ("B8", "B4"),
        "Soil-Adjusted Vegetation Index",
    ),  # computed via expression with L
}


def _classify_ndvi(v):
    if v >= 0.5:
        return "Healthy"
    if v >= 0.3:
        return "Moderate"
    return "Stressed"


def _classify_ndre(v):
    if v >= 0.35:
        return "Healthy"
    if v >= 0.18:
        return "Moderate"
    return "Stressed"


# ---------------------------------------------------------------------------
# Demo mode: plausible synthetic indices so the Flutter app can be tested
# before Earth Engine credentials exist.
# ---------------------------------------------------------------------------
def _demo_analysis(polygon, start_date, end_date):
    coords = polygon.get("coordinates", [[]])[0]
    if not coords:
        raise ValueError("Polygon must have a coordinates ring")

    rng = random.Random(hash(tuple(map(tuple, coords))) & 0xFFFFFFFF)
    base_ndvi = rng.uniform(0.42, 0.72)

    def stat(code, name, mean, spread, classify):
        std = spread * 0.12
        return {
            "code": code,
            "name": name,
            "mean": round(mean, 4),
            "min": round(max(-1, mean - 2 * std), 4),
            "max": round(min(1, mean + 2 * std), 4),
            "std": round(std, 4),
            "className": classify(mean),
        }

    indices = [
        stat("NDVI", INDICES["NDVI"][1], base_ndvi, 0.08, _classify_ndvi),
        stat("NDRE", INDICES["NDRE"][1], base_ndvi - 0.12, 0.07, _classify_ndre),
        stat("EVI", INDICES["EVI"][1], base_ndvi * 0.85, 0.09, _classify_ndvi),
        stat("SAVI", INDICES["SAVI"][1], base_ndvi * 0.92, 0.08, _classify_ndvi),
    ]
    overall = _classify_ndvi(base_ndvi)
    return {
        "analyzedAt": datetime.now(timezone.utc).isoformat(),
        "startDate": start_date,
        "endDate": end_date,
        "imagery": "Sentinel-2 (demo)",
        "overallClass": overall,
        "thumbnailBase64": _demo_thumbnail(overall),
        "indices": indices,
    }


def _demo_thumbnail(overall):
    """Generate a simple NDVI-style coloured PNG so the UI has a map to show."""
    try:
        from PIL import Image, ImageDraw

        colors = {
            "Healthy": (46, 125, 50),
            "Moderate": (249, 168, 37),
            "Stressed": (198, 40, 40),
        }
        base = colors.get(overall, (46, 125, 50))
        img = Image.new("RGB", (220, 150), (245, 245, 245))
        draw = ImageDraw.Draw(img)
        draw.ellipse([55, 30, 165, 120], fill=base)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
    except ImportError:
        return None


# ---------------------------------------------------------------------------
# Real Earth Engine analysis
# ---------------------------------------------------------------------------
def _ee_analysis(polygon, start_date, end_date):
    ee = _get_ee()

    coords = polygon.get("coordinates", [[]])[0]
    if len(coords) < 4:
        raise ValueError("Polygon must have at least 3 points (closed ring)")
    geometry = ee.Geometry.Polygon([list(c) for c in coords])

    # Sentinel-2 surface reflectance, ~10 m resolution, cloud-filtered.
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
    )
    composite = collection.median()

    ndvi = composite.normalizedDifference(["B8", "B4"]).rename("NDVI")
    ndre = composite.normalizedDifference(["B8", "B5"]).rename("NDRE")
    evi = (
        composite.expression(
            "2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 10000))",
            {
                "NIR": composite.select("B8"),
                "RED": composite.select("B4"),
                "BLUE": composite.select("B2"),
            },
        )
        .rename("EVI")
        .float()
    )
    savi = (
        composite.expression(
            "((NIR - RED) / (NIR + RED + 0.5)) * 1.5",
            {
                "NIR": composite.select("B8"),
                "RED": composite.select("B4"),
            },
        )
        .rename("SAVI")
        .float()
    )

    image = ee.Image([ndvi, ndre, evi, savi])

    stats = image.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geometry,
        scale=10,
        maxPixels=1e9,
        bestEffort=True,
    ).getInfo()

    index_data = [
        {
            "code": "NDVI",
            "name": INDICES["NDVI"][1],
            "mean": _num(stats, "NDVI"),
            "className": _classify_ndvi(_num(stats, "NDVI")),
        },
        {
            "code": "NDRE",
            "name": INDICES["NDRE"][1],
            "mean": _num(stats, "NDRE"),
            "className": _classify_ndre(_num(stats, "NDRE")),
        },
        {
            "code": "EVI",
            "name": INDICES["EVI"][1],
            "mean": _num(stats, "EVI"),
            "className": _classify_ndvi(_num(stats, "EVI")),
        },
        {
            "code": "SAVI",
            "name": INDICES["SAVI"][1],
            "mean": _num(stats, "SAVI"),
            "className": _classify_ndvi(_num(stats, "SAVI")),
        },
    ]

    # Add min/max/std by sampling the region with a combined reducer.
    region_stats = image.reduceRegion(
        reducer=ee.Reducer.percentile([5, 95]).combine(
            ee.Reducer.stdDev(), sharedInputs=True
        ),
        geometry=geometry,
        scale=10,
        maxPixels=1e9,
        bestEffort=True,
    ).getInfo()

    for idx in index_data:
        code = idx["code"]
        p05 = region_stats.get(f"{code}_p5")
        p95 = region_stats.get(f"{code}_p95")
        std = region_stats.get(f"{code}_stdDev")
        idx["min"] = round(p05 if p05 is not None else idx["mean"] * 0.8, 4)
        idx["max"] = round(p95 if p95 is not None else idx["mean"] * 1.2, 4)
        idx["std"] = round(std if std is not None else 0.05, 4)
        idx["mean"] = round(idx["mean"], 4)

    overall = _classify_ndvi(index_data[0]["mean"])

    return {
        "analyzedAt": datetime.now(timezone.utc).isoformat(),
        "startDate": start_date,
        "endDate": end_date,
        "imagery": "Sentinel-2",
        "overallClass": overall,
        "thumbnailBase64": _ee_thumbnail(composite, geometry),
        "indices": index_data,
    }


def _ee_thumbnail(composite, geometry):
    """Render the plot region as a colour-mapped NDVI PNG (base64)."""
    try:
        vis = {
            "min": -0.2,
            "max": 0.8,
            "palette": ["brown", "orange", "yellow", "lightgreen", "darkgreen"],
        }
        ndvi_vis = (
            composite.normalizedDifference(["B8", "B4"]).clip(geometry).visualize(**vis)
        )
        url = ndvi_vis.getThumbURL(
            {
                "region": geometry.bounds().getInfo()["coordinates"],
                "dimensions": "440x300",
            }
        )
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        return base64.b64encode(resp.content).decode()
    except Exception:
        return None


def _num(d, key):
    """Pull a number from an EE reducer dict, defaulting to 0 when absent."""
    v = d.get(key)
    return v if v is not None else 0.0


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "demo_mode": DEMO_MODE}


@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    try:
        if DEMO_MODE:
            result = _demo_analysis(req.polygon, req.start_date, req.end_date)
        else:
            result = _ee_analysis(req.polygon, req.start_date, req.end_date)
        return result
    except Exception as exc:  # surface useful error text to the app
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=400,
            content={"error": str(exc), "detail": str(exc)},
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
