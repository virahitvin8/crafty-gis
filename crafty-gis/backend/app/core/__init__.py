"""
Configuration for the AI Investigator — defines the question categories and
analysis types the system can ask about and process.
"""

from typing import Literal

# =============================================================================
# INVESTIGATION QUESTION TEMPLATES
# =============================================================================
# The AI uses these categories to build targeted questions for the user.
# Each question is tailored based on what the user has already told us.

QUESTION_CATEGORIES = {
    "problem_definition": {
        "label": "Problem Definition",
        "questions": [
            "What is the main problem you're trying to solve?",
            "What decision will this analysis help you make?",
            "What specific question do you want answered from the data?",
        ],
    },
    "geographic_scope": {
        "label": "Area of Interest",
        "questions": [
            "Which location or region are you studying? (country, state, district, or coordinates)",
            "How large is your study area? (in sq km or hectares)",
            "Do you have a boundary shapefile, or should we download one from OpenStreetMap?",
        ],
    },
    "time_period": {
        "label": "Time Period",
        "questions": [
            "What time period are you interested in? (e.g., 2020-2024, or just current conditions)",
            "Do you want a single snapshot, annual comparisons, or monthly trends?",
            "Are you looking at past conditions, future projections, or both?",
        ],
    },
    "analysis_type": {
        "label": "Analysis Type",
        "questions": [
            "What kind of analysis do you need? (e.g., land cover map, vegetation health, terrain, change detection)",
            "Do you need a simple map, a detailed report, raw data tables, or all of these?",
            "What level of detail is required? (general overview or high-precision analysis)",
        ],
    },
    "output_format": {
        "label": "Output Format",
        "questions": [
            "How should the final output be delivered? (PDF report, interactive map, shapefiles, GeoTIFFs, Excel tables)",
            "Do you need print-ready maps with legend and scale bar?",
            "Should the report include interpretation and methodology, or just the results?",
        ],
    },
    "data_preference": {
        "label": "Data Sources",
        "questions": [
            "Do you have your own data to upload, or should the system find and download it automatically?",
            "Preferred satellite imagery? (Sentinel-2 for high-res, Landsat for historical, MODIS for large areas)",
            "Any specific data requirements? (cloud-free, specific bands, specific season)",
        ],
    },
    "accuracy_level": {
        "label": "Quality & Accuracy",
        "questions": [
            "What is this analysis for? (academic research, government report, business decision, personal knowledge)",
            "What accuracy level do you need? (quick estimate vs. publishable results)",
            "Do you need field validation or ground truth data included?",
        ],
    },
    "technical_level": {
        "label": "Technical Comfort",
        "questions": [
            "How comfortable are you with GIS terminology? (I'll adjust the language accordingly)",
            "Should all explanations be in simple, non-technical language?",
            "Do you want to see the technical processing steps, or just the final results?",
        ],
    },
}

# =============================================================================
# SUPPORTED ANALYSIS TYPES
# =============================================================================

ANALYSIS_TYPES = {
    "land_use_land_cover": {
        "name": "Land Use / Land Cover Classification",
        "description": "Classify satellite imagery into land cover types (forest, water, agriculture, built-up, etc.)",
        "tools": ["qgis", "saga", "grass", "gdal"],
        "data_sources": ["sentinel-2", "landsat", "modis"],
        "complexity": "medium",
        "icon": "🗺️",
    },
    "change_detection": {
        "name": "Change Detection Analysis",
        "description": "Compare two or more time periods to detect changes in land cover, vegetation, or built-up areas",
        "tools": ["grass", "qgis", "gdal"],
        "data_sources": ["sentinel-2", "landsat", "modis"],
        "complexity": "high",
        "icon": "🔄",
    },
    "vegetation_health": {
        "name": "Vegetation Health (NDVI/NDMI)",
        "description": "Calculate vegetation indices like NDVI, EVI, NDMI to assess crop health and vegetation vigor",
        "tools": ["gdal", "qgis", "python"],
        "data_sources": ["sentinel-2", "landsat", "modis"],
        "complexity": "low",
        "icon": "🌿",
    },
    "terrain_analysis": {
        "name": "Terrain & Elevation Analysis",
        "description": "Generate DEMs, slope maps, aspect maps, hillshade, and perform watershed delineation",
        "tools": ["saga", "grass", "gdal"],
        "data_sources": ["srtm", "alos-palsar"],
        "complexity": "medium",
        "icon": "⛰️",
    },
    "heat_map": {
        "name": "Heat Map / Density Analysis",
        "description": "Create heat maps from point data showing density distributions of events, features, or measurements",
        "tools": ["qgis", "python"],
        "data_sources": ["user-data", "osm"],
        "complexity": "low",
        "icon": "🔥",
    },
    "watershed_analysis": {
        "name": "Watershed & Hydrological Analysis",
        "description": "Delineate watersheds, stream networks, flow accumulation, and drainage patterns from DEM data",
        "tools": ["saga", "grass", "gdal"],
        "data_sources": ["srtm", "alos-palsar"],
        "complexity": "high",
        "icon": "💧",
    },
    "landscape_metrics": {
        "name": "Landscape Fragmentation Analysis",
        "description": "Calculate landscape ecology metrics (patch density, diversity indices, fragmentation) using Fragstats",
        "tools": ["fragstats", "qgis", "python"],
        "data_sources": ["user-data", "sentinel-2", "landsat"],
        "complexity": "high",
        "icon": "🧩",
    },
    "agriculture_monitoring": {
        "name": "Agricultural Monitoring",
        "description": "Monitor crop health, estimate yields, detect crop stress, and map agricultural land use",
        "tools": ["qgis", "gdal", "python"],
        "data_sources": ["sentinel-2", "landsat", "modis", "chirps"],
        "complexity": "high",
        "icon": "🌾",
    },
}

# =============================================================================
# AVAILABLE GIS TOOLS
# =============================================================================

GIS_TOOLS = {
    "gdal": {
        "name": "GDAL",
        "full_name": "Geospatial Data Abstraction Library",
        "description": "Universal raster and vector data translation library",
        "type": "library",
        "free": True,
        "capabilities": ["convert", "warp", "clip", "mosaic", "reproject", "calculate"],
    },
    "qgis": {
        "name": "QGIS",
        "full_name": "Quantum GIS",
        "description": "Full-featured open-source GIS desktop application",
        "type": "application",
        "free": True,
        "capabilities": ["classify", "vector_analysis", "raster_analysis", "cartography", "plugins"],
    },
    "saga": {
        "name": "SAGA GIS",
        "full_name": "System for Automated Geoscientific Analyses",
        "description": "Specialized in terrain analysis, hydrology, and environmental modeling",
        "type": "application",
        "free": True,
        "capabilities": ["terrain", "hydrology", "climate", "classification", "geostatistics"],
    },
    "grass": {
        "name": "GRASS GIS",
        "full_name": "Geographic Resources Analysis Support System",
        "description": "Comprehensive GIS for raster/vector analysis, remote sensing, and temporal data",
        "type": "application",
        "free": True,
        "capabilities": ["raster_analysis", "vector_analysis", "temporal", "remote_sensing", "hydrology"],
    },
}

# =============================================================================
# DATA SOURCE REGISTRY
# =============================================================================

DATA_SOURCES = {
    "sentinel-2": {
        "name": "Sentinel-2",
        "provider": "ESA Copernicus",
        "resolution": "10m-60m",
        "bands": 13,
        "free": True,
        "access_method": "api",
        "api_url": "https://scihub.copernicus.eu/dhus",
    },
    "landsat": {
        "name": "Landsat 8/9",
        "provider": "NASA/USGS",
        "resolution": "15m-30m",
        "bands": 11,
        "free": True,
        "access_method": "api",
        "api_url": "https://earthexplorer.usgs.gov",
    },
    "modis": {
        "name": "MODIS",
        "provider": "NASA",
        "resolution": "250m-1km",
        "bands": 36,
        "free": True,
        "access_method": "api",
        "api_url": "https://lpdaac.usgs.gov",
    },
    "srtm": {
        "name": "SRTM DEM",
        "provider": "NASA",
        "resolution": "30m",
        "free": True,
        "access_method": "api",
        "api_url": "https://earthdata.nasa.gov",
    },
    "osm": {
        "name": "OpenStreetMap",
        "provider": "OpenStreetMap Community",
        "description": "Global vector basemap with roads, buildings, boundaries, and land use",
        "free": True,
        "access_method": "api",
        "api_url": "https://overpass-api.de",
    },
}
