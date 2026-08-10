"""
CRAFTY GIS — Report Generation API
Generates PDF field-analysis reports containing vegetation indices, soil
properties, weather summary, crop health, and recommendations.

Uses reportlab for in-memory PDF creation.
"""

import io
import logging
import math
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/report", tags=["report"])

# ---------------------------------------------------------------------------
# In-memory report store
# ---------------------------------------------------------------------------
reports_db: Dict[str, Dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ReportGenerateRequest(BaseModel):
    field_id: Optional[str] = Field(None, description="Saved field ID to attach the report to")
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    bbox: Optional[List[float]] = Field(None, min_length=4, max_length=4)
    crop_type: str = Field("generic")
    planting_date: Optional[str] = None
    start_date: Optional[str] = Field(None, description="Analysis period start (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="Analysis period end (YYYY-MM-DD)")
    include_sections: List[str] = Field(
        default=["vegetation", "soil", "weather", "crop_health", "recommendations"],
        description="Report sections to include",
    )
    title: Optional[str] = Field(None, description="Custom report title")


class ReportResponse(BaseModel):
    report_id: str
    title: str
    status: str
    sections: List[str]
    created_at: str
    download_url: str


class ReportInfoResponse(BaseModel):
    report_id: str
    title: str
    lat: float
    lng: float
    crop_type: str
    sections: List[str]
    created_at: str
    file_size_bytes: Optional[int] = None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _compute_centroid_from_bbox(bbox: List[float]) -> List[float]:
    return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]


async def _gather_report_data(request: ReportGenerateRequest) -> Dict[str, Any]:
    """Collect data for each report section from internal APIs."""
    bbox = request.bbox or [request.lng - 0.005, request.lat - 0.005,
                            request.lng + 0.005, request.lat + 0.005]
    data: Dict[str, Any] = {
        "lat": request.lat,
        "lng": request.lng,
        "bbox": bbox,
        "crop_type": request.crop_type,
    }

    # Vegetation indices
    if "vegetation" in request.include_sections:
        from app.api.vegetation import _generate_simulated_reflectance
        for idx_name in ["ndvi", "evi", "gndvi", "ndmi"]:
            ref = _generate_simulated_reflectance(idx_name, bbox, request.lat, request.lng, 15)
            data[f"vegetation_{idx_name}"] = ref["statistics"]

    # Soil properties
    if "soil" in request.include_sections:
        from app.api.soil import _get_simulated_soil, _compute_health_score
        props = await _get_simulated_soil(request.lat, request.lng)
        health = _compute_health_score(props)
        data["soil"] = {"properties": [p.model_dump() for p in props], "health": health}

    # Weather
    if "weather" in request.include_sections:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude": request.lat,
                        "longitude": request.lng,
                        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
                    },
                )
                if resp.status_code == 200:
                    data["weather"] = resp.json().get("current", {})
                else:
                    raise httpx.HTTPError("non-200")
        except Exception:
            rng = np.random.default_rng(int((request.lat * 1000 + request.lng * 1000) % (2**31)))
            data["weather"] = {
                "temperature_2m": round(float(rng.uniform(15, 35)), 1),
                "relative_humidity_2m": round(float(rng.uniform(35, 80)), 1),
                "precipitation": round(float(rng.uniform(0, 5)), 1),
                "wind_speed_10m": round(float(rng.uniform(1, 6)), 1),
            }

    # Crop health
    if "crop_health" in request.include_sections:
        from app.api.crop_monitor import _simulate_vegetation_indices, _estimate_growth_stage
        doy = datetime.utcnow().timetuple().tm_yday
        idx = _simulate_vegetation_indices(request.lat, request.lng, request.crop_type, doy)
        gs = _estimate_growth_stage(idx["ndvi"], None, request.crop_type)
        data["crop_health"] = {
            "ndvi": idx["ndvi"],
            "evi": idx["evi"],
            "growth_stage": gs["stage"],
            "stage_confidence": gs["confidence"],
        }

    # Recommendations
    if "recommendations" in request.include_sections:
        recs = []
        if "soil" in request.include_sections:
            from app.api.soil import _generate_recommendations
            props = await _get_simulated_soil(request.lat, request.lng)
            recs.extend(_generate_recommendations(props, request.crop_type))
        if not recs:
            recs = [
                "Conduct regular field scouting at least weekly",
                "Monitor NDVI time series for anomaly detection",
                "Apply balanced fertilization based on soil test results",
            ]
        data["recommendations"] = recs

    return data


def _build_pdf_bytes(
    report_id: str,
    title: str,
    data: Dict[str, Any],
    sections: List[str],
) -> bytes:
    """
    Build a PDF report using reportlab.

    Returns raw bytes of the generated PDF.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm, mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleCustom", parent=styles["Title"], fontSize=18, spaceAfter=12)
    heading_style = ParagraphStyle("HeadingCustom", parent=styles["Heading2"], fontSize=13, spaceAfter=8, textColor=colors.HexColor("#1a5276"))
    body_style = styles["BodyText"]

    story: List[Any] = []

    # Title page
    story.append(Paragraph(title, title_style))
    story.append(Paragraph(
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", body_style))
    story.append(Paragraph(
        f"Location: {data['lat']:.4f}, {data['lng']:.4f}", body_style))
    story.append(Paragraph(
        f"Crop: {data.get('crop_type', 'N/A').capitalize()}", body_style))
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", color=colors.grey))
    story.append(Spacer(1, 0.5 * cm))

    # Section: Vegetation
    if "vegetation" in sections:
        story.append(Paragraph("Vegetation Indices", heading_style))
        for idx_name in ["ndvi", "evi", "gndvi", "ndmi"]:
            stats = data.get(f"vegetation_{idx_name}", {})
            if stats:
                story.append(Paragraph(
                    f"<b>{idx_name.upper()}</b>: min={stats.get('min', 0)}, "
                    f"max={stats.get('max', 0)}, mean={stats.get('mean', 0)}, "
                    f"std={stats.get('std', 0)}",
                    body_style,
                ))
        story.append(Spacer(1, 0.3 * cm))

    # Section: Soil
    if "soil" in sections and "soil" in data:
        story.append(Paragraph("Soil Properties", heading_style))
        soil = data["soil"]
        for prop in soil.get("properties", []):
            story.append(Paragraph(
                f"<b>{prop.get('name', '')}</b>: {prop.get('value_mean', 0)} "
                f"{prop.get('unit', '')}",
                body_style,
            ))
        health = soil.get("health", {})
        story.append(Paragraph(
            f"<b>Soil Health Score</b>: {health.get('overall', 0)}/100 "
            f"({health.get('rating', 'N/A')})",
            body_style,
        ))
        story.append(Spacer(1, 0.3 * cm))

    # Section: Weather
    if "weather" in sections and "weather" in data:
        story.append(Paragraph("Current Weather", heading_style))
        w = data["weather"]
        story.append(Paragraph(
            f"Temperature: {w.get('temperature_2m', 'N/A')} C | "
            f"Humidity: {w.get('relative_humidity_2m', 'N/A')}% | "
            f"Precipitation: {w.get('precipitation', 'N/A')} mm | "
            f"Wind: {w.get('wind_speed_10m', 'N/A')} m/s",
            body_style,
        ))
        story.append(Spacer(1, 0.3 * cm))

    # Section: Crop Health
    if "crop_health" in sections and "crop_health" in data:
        story.append(Paragraph("Crop Health Assessment", heading_style))
        ch = data["crop_health"]
        story.append(Paragraph(
            f"NDVI: {ch.get('ndvi', 0)} | EVI: {ch.get('evi', 0)} | "
            f"Growth Stage: {ch.get('growth_stage', 'unknown')} "
            f"(confidence: {ch.get('stage_confidence', 0):.0%})",
            body_style,
        ))
        story.append(Spacer(1, 0.3 * cm))

    # Section: Recommendations
    if "recommendations" in sections and "recommendations" in data:
        story.append(Paragraph("Management Recommendations", heading_style))
        for i, rec in enumerate(data["recommendations"], 1):
            story.append(Paragraph(f"{i}. {rec}", body_style))
        story.append(Spacer(1, 0.3 * cm))

    # Footer
    story.append(HRFlowable(width="100%", color=colors.grey))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        f"Report ID: {report_id} | Crafty GIS - Agricultural Intelligence Platform",
        ParagraphStyle("Footer", parent=body_style, fontSize=8, textColor=colors.grey),
    ))

    doc.build(story)
    return buf.getvalue()

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate", response_model=ReportResponse)
async def generate_report(request: ReportGenerateRequest):
    """
    Generate a **PDF field-analysis report**.

    Collects vegetation, soil, weather, crop health, and recommendation
    data, and compiles it into a downloadable PDF.
    """
    report_id = str(uuid.uuid4())[:12]
    now = datetime.utcnow().isoformat()
    title = request.title or f"Field Analysis Report - {request.crop_type.capitalize()}"

    try:
        data = await _gather_report_data(request)
        pdf_bytes = _build_pdf_bytes(report_id, title, data, request.include_sections)

        reports_db[report_id] = {
            "report_id": report_id,
            "title": title,
            "lat": request.lat,
            "lng": request.lng,
            "crop_type": request.crop_type,
            "sections": request.include_sections,
            "field_id": request.field_id,
            "created_at": now,
            "pdf_bytes": pdf_bytes,
            "file_size_bytes": len(pdf_bytes),
        }

        logger.info("Generated report %s (%d bytes)", report_id, len(pdf_bytes))

        return ReportResponse(
            report_id=report_id,
            title=title,
            status="completed",
            sections=request.include_sections,
            created_at=now,
            download_url=f"/api/report/{report_id}/download",
        )
    except Exception as exc:
        logger.error("Report generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}")


@router.get("/{report_id}/download")
async def download_report(report_id: str):
    """
    Download a previously generated PDF report.

    Returns the PDF as a streaming response.
    """
    report = reports_db.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_bytes = report.get("pdf_bytes", b"")
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="PDF content is empty")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{report["title"].replace(" ", "_")}_{report_id}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.get("/{report_id}", response_model=ReportInfoResponse)
async def get_report_info(report_id: str):
    """Get metadata about a generated report."""
    report = reports_db.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return ReportInfoResponse(
        report_id=report["report_id"],
        title=report["title"],
        lat=report["lat"],
        lng=report["lng"],
        crop_type=report["crop_type"],
        sections=report["sections"],
        created_at=report["created_at"],
        file_size_bytes=report.get("file_size_bytes"),
    )


@router.get("")
async def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
):
    """List all generated reports."""
    all_reports = sorted(reports_db.values(), key=lambda r: r["created_at"], reverse=True)
    page = all_reports[skip:skip + limit]
    return {
        "reports": [
            {
                "report_id": r["report_id"],
                "title": r["title"],
                "crop_type": r["crop_type"],
                "created_at": r["created_at"],
                "file_size_bytes": r.get("file_size_bytes"),
            }
            for r in page
        ],
        "total": len(all_reports),
    }
