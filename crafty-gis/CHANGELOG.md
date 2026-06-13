# Changelog

All notable changes to CRAFTY GIS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-30

### 🎉 Initial Release — "Gaia"

The first public release of CRAFTY GIS — an AI-powered geospatial intelligence platform.

### 🚀 Features

#### 🤖 AI Investigation System
- Hybrid conversation + structured wizard interface for problem understanding
- AI asks targeted questions (location, time period, analysis type, output format)
- Mid-workflow interruption and plan regeneration
- Context-aware response generation via local Ollama LLM

#### 🗺️ GIS Processing Engine
- Multi-tool dispatch supporting GDAL, GeoPandas, Rasterio, QGIS, SAGA GIS, GRASS GIS, Fragstats
- 12+ analysis types: LULC classification, vegetation indices, change detection, terrain analysis, crop health, urban sprawl, flood mapping, land surface temperature, watershed delineation, landscape metrics, biomass estimation, soil moisture
- Automated band computation, classification, and statistical analysis
- Asynchronous processing with progress tracking

#### 🌐 Data Downloader
- Automated data retrieval from 10+ sources: Sentinel-1/2, Landsat 8/9, MODIS, SRTM, CHIRPS, ERA5, OpenStreetMap, GBIF, FAO GeoNetwork
- Cloud masking, atmospheric correction preparation
- Multi-temporal data fetching

#### 📄 Report Generator
- Automated PDF, HTML, Markdown, and JSON report generation
- Professional formatting with statistics, charts, and maps
- Configurable output templates
- WeasyPrint/wkhtmltopdf backend for PDF generation

#### 🖥️ Next.js Frontend Dashboard
- Five-panel dashboard (Chat, Map, Workflow, Outputs, History)
- MapLibre GL interactive map with dynamic layer controls
- Real-time workflow progress tracking with live updates
- File download management with type-based icons
- Activity timeline and session history
- Hybrid chat + structured wizard interface
- Responsive design with mobile sidebar
- Dark theme optimized for long analysis sessions

#### 🛠️ Infrastructure
- Docker Compose deployment (PostGIS + Ollama + Backend + Frontend)
- One-click setup script for local development
- Tauri desktop configuration for native packaging
- SQLAlchemy ORM with PostgreSQL + PostGIS support
- SQLite fallback for development
- Comprehensive REST API with auto-generated docs

### 🧪 Supported Analysis Types
- Land Use / Land Cover Classification
- Change Detection (multi-temporal)
- Vegetation Health (NDVI, EVI, NDMI, SAVI)
- Terrain & Elevation Analysis (DEM, slope, aspect, hillshade)
- Heat Map / Density Analysis
- Watershed & Hydrological Analysis
- Landscape Fragmentation Metrics
- Agricultural Monitoring & Crop Health
- Urban Sprawl / Built-up Analysis
- Flood Extent Mapping
- Land Surface Temperature
- Biomass & Carbon Stock Estimation

### 📦 What's Included
- Full backend API with all routes documented
- Complete frontend dashboard with all panels
- Local AI integration via Ollama (free, private)
- 12 geospatial analysis types with extensible architecture
- 10+ external data source connectors
- Docker Compose for full-stack deployment
- Setup script for one-click local installation
- Comprehensive README with architecture documentation

### 🐛 Fixed (since previous internal builds)
- Added missing `Enum` import in `data_downloader.py`
- Fixed workflow polling endpoint routing
- Fixed CORS configuration for development
- Fixed demo mode fallback responses

### ⚠️ Known Issues
- PostgreSQL + PostGIS connection requires manual database creation on first run
- WeasyPrint requires system-level dependencies on some platforms
- Ollama model download requires significant bandwidth for first-time setup
- Some data source APIs require free registration

---

## [0.1.0-beta] - 2026-05-20

### 🏗️ Pre-release
- Initial project scaffolding
- Core AI investigator prototype
- Basic chat interface
- Foundation architecture decisions

---

[1.0.0]: https://github.com/virahitvin8/crafty-gis/releases/tag/v1.0.0
[0.1.0-beta]: https://github.com/virahitvin8/crafty-gis/releases/tag/v0.1.0-beta
