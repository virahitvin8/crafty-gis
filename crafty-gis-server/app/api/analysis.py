"""
CRAFTY GIS — Simple Analysis API
Essential endpoints for running geospatial analyses.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid
import json
import os
from pathlib import Path

from app.core.gis_processor import GISProcessor

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

# In-memory storage for analysis results (in production, use a proper database or file storage)
analysis_results: Dict[str, Dict[str, Any]] = {}
gis_processor = GISProcessor()

# Supported analysis types and their required parameters
ANALYSIS_TYPES = {
    "ndvi": {
        "name": "Normalized Difference Vegetation Index",
        "description": "Calculate NDVI for vegetation health assessment",
        "parameters": {
            "nir_band": {"type": "int", "default": 8, "description": "Near-infrared band number"},
            "red_band": {"type": "int", "default": 4, "description": "Red band number"}
        }
    },
    "mndwi": {
        "name": "Modified Normalized Difference Water Index",
        "description": "Detect water bodies using green and SWIR bands",
        "parameters": {
            "green_band": {"type": "int", "default": 3, "description": "Green band number"},
            "swir_band": {"type": "int", "default": 11, "description": "SWIR band number"}
        }
    },
    "built_up": {
        "name": "Built-up Index",
        "description": "Detect urban areas using NIR and SWIR bands",
        "parameters": {
            "nir_band": {"type": "int", "default": 8, "description": "Near-infrared band number"},
            "swir_band": {"type": "int", "default": 11, "description": "SWIR band number"}
        }
    },
    "methane": {
        "name": "Methane Detection",
        "description": "Detect methane plumes using SWIR bands",
        "parameters": {
            "swir1_band": {"type": "int", "default": 11, "description": "First SWIR band"},
            "swir2_band": {"type": "int", "default": 12, "description": "Second SWIR band"}
        }
    },
    "lulc": {
        "name": "Land Use/Land Cover Classification",
        "description": "Classify land cover using satellite bands (K-means clustering)",
        "parameters": {
            "num_classes": {"type": "int", "default": 5, "description": "Number of land cover classes"},
            "bands": {"type": "list", "default": [2, 3, 4, 8], "description": "Band indices to use for classification"}
        }
    }
}

class AnalysisRequest(BaseModel):
    analysis_type: str
    parameters: Dict[str, Any] = {}

class AnalysisResponse(BaseModel):
    id: str
    analysis_type: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@router.get("/types")
async def get_analysis_types():
    """Get all supported analysis types."""
    return {
        "analysis_types": [
            {
                "id": analysis_id,
                "name": info["name"],
                "description": info["description"],
                "parameters": info["parameters"]
            }
            for analysis_id, info in ANALYSIS_TYPES.items()
        ]
    }

@router.post("/run", response_model=AnalysisResponse)
async def run_analysis(request: AnalysisRequest):
    """Run a geospatial analysis."""
    analysis_type = request.analysis_type
    parameters = request.parameters

    if analysis_type not in ANALYSIS_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported analysis type: {analysis_type}")

    analysis_id = str(uuid.uuid4())

    try:
        # Run the analysis using the GIS processor
        result = await _run_analysis_by_type(analysis_type, parameters, analysis_id)

        # Store the result
        analysis_results[analysis_id] = {
            "analysis_type": analysis_type,
            "parameters": parameters,
            "result": result,
            "status": "completed"
        }

        return AnalysisResponse(
            id=analysis_id,
            analysis_type=analysis_type,
            status="completed",
            result=result
        )
    except Exception as e:
        # Store the error
        analysis_results[analysis_id] = {
            "analysis_type": analysis_type,
            "parameters": parameters,
            "error": str(e),
            "status": "failed"
        }
        return AnalysisResponse(
            id=analysis_id,
            analysis_type=analysis_type,
            status="failed",
            error=str(e)
        )

@router.get("/result/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis_result(analysis_id: str):
    """Get the result of a previously run analysis."""
    if analysis_id not in analysis_results:
        raise HTTPException(status_code=404, detail="Analysis not found")

    result_data = analysis_results[analysis_id]
    return AnalysisResponse(
        id=analysis_id,
        analysis_type=result_data["analysis_type"],
        status=result_data["status"],
        result=result_data.get("result"),
        error=result_data.get("error")
    )

async def _run_analysis_by_type(analysis_type: str, parameters: Dict[str, Any], analysis_id: str = "") -> Dict[str, Any]:
    """Run the specific analysis type using the GIS processor."""
    # For now, we'll use sample data. In a real app, we'd accept user-uploaded data.
    # We'll create a sample GeoTIFF file for demonstration.
    sample_data_path = Path(__file__).resolve().parent.parent.parent / "sample_data" / "sample.tif"

    # Ensure sample data directory exists
    sample_data_path.parent.mkdir(parents=True, exist_ok=True)

    # If sample data doesn't exist, create a simple dummy file
    if not sample_data_path.exists():
        # Create a dummy GeoTIFF for demonstration purposes
        # In a real implementation, you would use actual satellite data
        await _create_sample_data(sample_data_path)

    # Run the analysis based on type
    if analysis_type == "ndvi":
        nir_band = parameters.get("nir_band", 8)
        red_band = parameters.get("red_band", 4)
        output_path = Path(__file__).resolve().parent.parent.parent / "outputs" / f"ndvi_{analysis_id}.tif"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        result = await gis_processor.compute_ndvi(
            input_path=str(sample_data_path),
            output_path=str(output_path),
            nir_band=nir_band,
            red_band=red_band
        )
        return {
            "type": "ndvi",
            "output_file": str(output_path),
            "statistics": result.get("results", [{}])[0] if result.get("results") else {},
            "description": "NDVI analysis completed successfully"
        }

    elif analysis_type == "mndwi":
        green_band = parameters.get("green_band", 3)
        swir_band = parameters.get("swir_band", 11)
        output_path = Path(__file__).resolve().parent.parent.parent / "outputs" / f"mndwi_{analysis_id}.tif"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        # For MNDWI, we'll use a similar approach but with different bands
        # We'll create a custom function or use rasterio directly
        result = await gis_processor._execute_rasterio("mndwi", {
            "input_path": str(sample_data_path),
            "output_path": str(output_path),
            "operations": ["mndwi"],
            "green_band": green_band,
            "swir_band": swir_band
        })
        return {
            "type": "mndwi",
            "output_file": str(output_path),
            "statistics": result.get("results", [{}])[0] if result.get("results") else {},
            "description": "MNDWI analysis completed successfully"
        }

    elif analysis_type == "built_up":
        nir_band = parameters.get("nir_band", 8)
        swir_band = parameters.get("swir_band", 11)
        output_path = Path(__file__).resolve().parent.parent.parent / "outputs" / f"built_up_{analysis_id}.tif"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        # Built-up index: (SWIR - NIR) / (SWIR + NIR)
        result = await gis_processor._execute_rasterio("built_up", {
            "input_path": str(sample_data_path),
            "output_path": str(output_path),
            "operations": ["built_up"],
            "nir_band": nir_band,
            "swir_band": swir_band
        })
        return {
            "type": "built_up",
            "output_file": str(output_path),
            "statistics": result.get("results", [{}])[0] if result.get("results") else {},
            "description": "Built-up index analysis completed successfully"
        }

    elif analysis_type == "methane":
        swir1_band = parameters.get("swir1_band", 11)
        swir2_band = parameters.get("swir2_band", 12)
        output_path = Path(__file__).resolve().parent.parent.parent / "outputs" / f"methane_{analysis_id}.tif"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        # Methane detection: simple ratio or difference of SWIR bands
        result = await gis_processor._execute_rasterio("methane", {
            "input_path": str(sample_data_path),
            "output_path": str(output_path),
            "operations": ["methane"],
            "swir1_band": swir1_band,
            "swir2_band": swir2_band
        })
        return {
            "type": "methane",
            "output_file": str(output_path),
            "statistics": result.get("results", [{}])[0] if result.get("results") else {},
            "description": "Methane detection analysis completed successfully"
        }

    elif analysis_type == "lulc":
        num_classes = parameters.get("num_classes", 5)
        bands = parameters.get("bands", [2, 3, 4, 8])
        output_path = Path(__file__).resolve().parent.parent.parent / "outputs" / f"lulc_{analysis_id}.tif"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        result = await gis_processor.classify_lulc(
            input_path=str(sample_data_path),
            n_classes=num_classes,
            output_path=str(output_path)
        )
        return {
            "type": "lulc",
            "output_file": str(output_path),
            "statistics": result.get("results", [{}])[0] if result.get("results") else {},
            "description": "LULC classification completed successfully"
        }

    else:
        raise ValueError(f"Unknown analysis type: {analysis_type}")

async def _create_sample_data(file_path: Path):
    """Create a sample GeoTIFF file for demonstration purposes."""
    # We'll use rasterio to create a simple dummy multi-band image
    code = f"""
import rasterio
import numpy as np
from rasterio.transform import from_origin

# Create a dummy 12-band image (100x100 pixels)
width, height = 100, 100
count = 12  # Number of bands

# Create dummy data for each band (simple patterns)
data = np.zeros((count, height, width), dtype=np.float32)
for i in range(count):
    # Create some variation per band
    data[i] = np.random.rand(height, width) * 10000  # Simulate reflectance values

# Define geotransform (upper left corner, pixel size)
transform = from_origin(-180, 90, 0.01, 0.01)  # 0.01 degree pixels

# Define CRS (WGS84)
crs = "EPSG:4326"

# Write the GeoTIFF
profile = {{
    'driver': 'GTiff',
    'width': width,
    'height': height,
    'count': count,
    'dtype': rasterio.float32,
    'crs': crs,
    'transform': transform,
}}

with rasterio.open({{file_path!r}}, 'w', **profile) as dst:
    dst.write(data.astype(rasterio.float32))
"""
    # Replace the file_path placeholder
    code = code.replace('{file_path!r}', repr(str(file_path)))

    # Execute the code to create the sample data
    await gis_processor._execute_python("create_sample_data", {"code": code})