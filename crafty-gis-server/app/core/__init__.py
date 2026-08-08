"""CRAFTY GIS — Core Module: Analysis Types, Tools, and Data Sources."""

from typing import Literal

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
# GIS TOOLS REGISTRY
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
