"""
CRAFTY GIS — Analysis API
Analysis execution, workflow management, progress tracking, and report generation.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.core.workflow_engine import WorkflowEngine
from app.core.gis_processor import GISProcessor
from app.core.report_generator import ReportGenerator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

# In-memory stores
analyses_db: Dict[str, Dict[str, Any]] = {}
workflow_engine = WorkflowEngine()
gis_processor = GISProcessor()
report_generator = ReportGenerator()


class AnalysisCreate(BaseModel):
    project_id: str
    session_id: str
    analysis_type: str
    title: str = ""
    description: str = ""
    parameters: Dict[str, Any] = {}
    intent: Dict[str, Any] = {}


class AnalysisResponse(BaseModel):
    id: str
    project_id: str
    session_id: str
    analysis_type: str
    title: str
    status: str
    workflow_id: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None
    progress: float = 0.0
    message: str = ""


@router.post("", response_model=AnalysisResponse)
async def create_analysis(request: AnalysisCreate):
    """Create and start a new analysis."""
    analysis_id = str(uuid.uuid4())[:8]
    now = datetime.utcnow().isoformat()

    # Create workflow
    workflow = await workflow_engine.create_workflow(
        project_id=request.project_id,
        session_id=request.session_id,
        user_input=request.description or request.analysis_type,
        context=request.intent,
    )

    analysis = {
        "id": analysis_id,
        "project_id": request.project_id,
        "session_id": request.session_id,
        "analysis_type": request.analysis_type,
        "title": request.title or f"{request.analysis_type.replace('_', ' ').title()} Analysis",
        "description": request.description,
        "parameters": request.parameters,
        "intent": request.intent,
        "status": "created",
        "workflow_id": workflow.id,
        "workflow": workflow.to_dict(),
        "created_at": now,
        "completed_at": None,
        "progress": 0.0,
        "outputs": [],
    }
    analyses_db[analysis_id] = analysis

    return AnalysisResponse(
        id=analysis_id,
        project_id=request.project_id,
        session_id=request.session_id,
        analysis_type=request.analysis_type,
        title=analysis["title"],
        status="created",
        workflow_id=workflow.id,
        created_at=now,
        progress=0.0,
        message=f"Analysis created with {len(workflow.tasks)} tasks in the workflow",
    )


@router.post("/{analysis_id}/execute")
async def execute_analysis(analysis_id: str, background_tasks: BackgroundTasks):
    """Execute an analysis workflow."""
    analysis = analyses_db.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if analysis["status"] not in ["created", "interrupted", "failed"]:
        raise HTTPException(status_code=400, detail=f"Analysis in state: {analysis['status']}")

    analysis["status"] = "running"
    workflow = workflow_engine.get_workflow(analysis["workflow_id"])

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Execute in background
    background_tasks.add_task(_execute_workflow_bg, analysis, workflow)

    return AnalysisResponse(
        id=analysis_id,
        project_id=analysis["project_id"],
        session_id=analysis["session_id"],
        analysis_type=analysis["analysis_type"],
        title=analysis["title"],
        status="running",
        workflow_id=analysis["workflow_id"],
        created_at=analysis["created_at"],
        progress=0.0,
        message=f"Analysis execution started with {len(workflow.tasks)} tasks",
    )


async def _execute_workflow_bg(analysis: Dict, workflow: Any):
    """Background task to execute workflow with progress updates."""
    try:
        async def status_callback(workflow_dict: Dict):
            analysis["workflow"] = workflow_dict
            completed = len([t for t in workflow.tasks if t.status.value == "completed"])
            total = len(workflow.tasks)
            analysis["progress"] = round((completed / total) * 100, 1) if total > 0 else 0

        result = await workflow_engine.execute_workflow(workflow.id, status_callback)

        analysis["status"] = "completed"
        analysis["completed_at"] = datetime.utcnow().isoformat()
        analysis["progress"] = 100.0
        analysis["results"] = result

        # Generate report automatically
        report = await report_generator.generate_report(
            analysis_type=analysis["analysis_type"],
            data=analysis,
            format="html",
            title=f"{analysis['title']} — CRAFTY GIS Report",
        )
        analysis["report"] = report

        logger.info(f"Analysis {analysis['id']} completed")

    except Exception as e:
        analysis["status"] = "failed"
        analysis["error"] = str(e)
        logger.error(f"Analysis {analysis['id']} failed: {e}")


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: str):
    """Get analysis status and details."""
    analysis = analyses_db.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return AnalysisResponse(
        id=analysis_id,
        project_id=analysis["project_id"],
        session_id=analysis["session_id"],
        analysis_type=analysis["analysis_type"],
        title=analysis["title"],
        status=analysis["status"],
        workflow_id=analysis.get("workflow_id"),
        created_at=analysis["created_at"],
        completed_at=analysis.get("completed_at"),
        progress=analysis.get("progress", 0.0),
        message=analysis.get("error", f"Analysis is {analysis['status']}"),
    )


@router.get("/{analysis_id}/workflow")
async def get_workflow(analysis_id: str):
    """Get the full workflow for an analysis."""
    analysis = analyses_db.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    workflow = workflow_engine.get_workflow(analysis.get("workflow_id", ""))
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return workflow.to_dict()


@router.get("/workflow/{workflow_id}")
async def get_workflow_by_id(workflow_id: str):
    """Get workflow by direct workflow ID (used by frontend polling)."""
    workflow = workflow_engine.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow.to_dict()


@router.get("/{analysis_id}/report")
async def get_report(analysis_id: str):
    """Get the generated report for an analysis."""
    analysis = analyses_db.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    report = analysis.get("report")
    if not report:
        raise HTTPException(status_code=404, detail="Report not yet generated")

    return report


@router.get("/{analysis_id}/outputs")
async def get_outputs(analysis_id: str):
    """Get all outputs from an analysis."""
    analysis = analyses_db.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {"outputs": analysis.get("outputs", [])}


@router.post("/{analysis_id}/interrupt")
async def interrupt_analysis(analysis_id: str):
    """Interrupt a running analysis."""
    analysis = analyses_db.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if analysis["status"] != "running":
        raise HTTPException(status_code=400, detail="Analysis is not running")

    workflow_id = analysis.get("workflow_id", "")
    interrupted = await workflow_engine.interrupt_workflow(workflow_id)

    if interrupted:
        analysis["status"] = "interrupted"
        return {
            "message": "Analysis interrupted. Provide new instructions to adjust.",
            "analysis_id": analysis_id,
            "workflow_id": workflow_id,
        }
    
    raise HTTPException(status_code=400, detail="Could not interrupt workflow")


@router.post("/{analysis_id}/regenerate")
async def regenerate_analysis(analysis_id: str, new_input: Dict[str, Any]):
    """Regenerate analysis plan with new input."""
    analysis = analyses_db.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    workflow = await workflow_engine.regenerate_plan(
        analysis["workflow_id"],
        new_input.get("message", ""),
        new_input.get("context", {}),
    )

    analysis["workflow"] = workflow.to_dict()
    analysis["status"] = "regenerated"

    return {
        "message": "Plan regenerated with new requirements",
        "workflow": workflow.to_dict(),
    }


@router.get("/types")
async def get_analysis_types():
    """Get all supported analysis types."""
    return {
        "analysis_types": [
            {
                "id": "lulc_classification",
                "name": "LULC Classification",
                "description": "Land Use/Land Cover classification using satellite imagery",
                "tools": ["python", "gdal", "rasterio"],
                "data_sources": ["sentinel-2", "landsat"],
            },
            {
                "id": "ndvi_analysis",
                "name": "Vegetation Index Analysis",
                "description": "NDVI, EVI, SAVI, NDWI computation and analysis",
                "tools": ["python", "rasterio"],
                "data_sources": ["sentinel-2", "landsat", "modis"],
            },
            {
                "id": "change_detection",
                "name": "Change Detection",
                "description": "Multi-temporal change detection analysis",
                "tools": ["python", "gdal", "rasterio"],
                "data_sources": ["sentinel-2", "landsat"],
            },
            {
                "id": "terrain_analysis",
                "name": "Terrain Analysis",
                "description": "DEM-based terrain analysis (slope, aspect, hillshade, hydrology)",
                "tools": ["gdal", "saga_gis", "grass_gis"],
                "data_sources": ["srtm"],
            },
            {
                "id": "crop_health",
                "name": "Crop Health Assessment",
                "description": "Multi-index crop health and stress analysis",
                "tools": ["python", "rasterio"],
                "data_sources": ["sentinel-2", "landsat", "modis"],
            },
            {
                "id": "urban_sprawl",
                "name": "Urban Sprawl Analysis",
                "description": "Urban expansion and land use conversion analysis",
                "tools": ["python", "geopandas", "fragstats"],
                "data_sources": ["landsat", "sentinel-2", "osm"],
            },
            {
                "id": "watershed_delineation",
                "name": "Watershed Delineation",
                "description": "Hydrological watershed analysis from DEM",
                "tools": ["saga_gis", "grass_gis", "gdal"],
                "data_sources": ["srtm"],
            },
            {
                "id": "flood_mapping",
                "name": "Flood Mapping",
                "description": "Flood extent mapping from SAR and optical imagery",
                "tools": ["python", "gdal", "rasterio"],
                "data_sources": ["sentinel-1", "sentinel-2"],
            },
            {
                "id": "land_surface_temperature",
                "name": "Land Surface Temperature",
                "description": "LST retrieval from thermal infrared bands",
                "tools": ["python", "rasterio"],
                "data_sources": ["landsat", "modis"],
            },
            {
                "id": "landscape_metrics",
                "name": "Landscape Metrics & Fragmentation",
                "description": "Landscape pattern and fragmentation analysis",
                "tools": ["fragstats", "python", "geopandas"],
                "data_sources": ["landsat", "sentinel-2"],
            },
            {
                "id": "biomass_estimation",
                "name": "Biomass & Carbon Stock Estimation",
                "description": "Above-ground biomass and carbon stock estimation",
                "tools": ["python", "rasterio"],
                "data_sources": ["sentinel-2", "landsat", "gedi"],
            },
            {
                "id": "soil_moisture",
                "name": "Soil Moisture Estimation",
                "description": "Surface soil moisture retrieval from SAR data",
                "tools": ["python", "gdal"],
                "data_sources": ["sentinel-1"],
            },
        ]
    }
