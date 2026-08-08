# 🌍 CRAFTY GIS

**Conversational Remote Analysis & Field Technology for GIS**

*AI-Powered GIS & Remote Sensing Problem-Solving Platform*

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com/)

---

## 🎯 The Vision

CRAFTY GIS is an **open-source, AI-powered geospatial intelligence platform** that makes satellite data analysis accessible to everyone — researchers, students, farmers, businesses, and government officers.

**Describe your problem in plain language, and CRAFTY GIS does the rest:**

1. 🗣️ **You describe** what you want to analyze
2. 🤖 **AI investigates** — asks smart questions until it fully understands your need
3. 🛠️ **System orchestrates** — selects tools, downloads data, runs analysis
4. 📊 **Delivers** — maps, reports, raw files, all downloadable
5. 🔄 **Adapts** — you can interrupt mid-workflow to change requirements

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🧠 **AI Conversation** | Hybrid chat + structured wizard that understands your exact needs |
| 📋 **Workflow Engine** | Auto-generates task plans from your description |
| 🗺️ **Live Map Preview** | MapLibre GL interactive map with dynamic layers |
| 📊 **Multi-Tool Processing** | Routes to GDAL, GeoPandas, Rasterio, QGIS, SAGA, GRASS, Fragstats |
| 🌐 **Data Sources** | Sentinel-1/2, Landsat, MODIS, SRTM, CHIRPS, ERA5, OSM, GBIF |
| 📄 **Report Generator** | Auto-generated PDF/HTML/MD reports with statistics |
| 🔄 **Mid-Workflow Interrupt** | Pause, adjust requirements, and continue |
| 💾 **All Outputs Downloadable** | Maps, reports, GeoTIFFs, shapefiles, CSVs |
| 🤖 **Local AI (Free)** | Runs on Ollama — no API bills, fully private |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CRAFTY GIS Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌──────────────────┐                  │
│  │  Next.js 16  │────▶│   FastAPI + AI   │                  │
│  │  Frontend    │     │   Investigator   │                  │
│  │  (React 19)  │     │                  │                  │
│  └──────┬──────┘     └────────┬─────────┘                  │
│         │                     │                            │
│         │              ┌──────┴────────┐                    │
│         │              │  Workflow     │                   │
│         │              │  Engine       │                    │
│         │              └──────┬────────┘                    │
│         │                     │                            │
│  ┌──────┴──────┐     ┌───────┴────────┐                   │
│  │  MapLibre   │     │  GIS Processor │                    │
│  │  GL (Map)   │     │  GDAL/Rasterio │                    │
│  └─────────────┘     │  GeoPandas     │                    │
│                      │  QGIS/SAGA/etc │                    │
│  ┌─────────────┐     └───────┬────────┘                    │
│  │  Live        │            │                             │
│  │  Dashboard   │     ┌──────┴────────┐                    │
│  │  + Panels    │     │  Data Sources  │                    │
│  └─────────────┘     │  Downloader    │                    │
│                      └───────────────┘                     │
│                                                             │
│  ┌─────────────┐     ┌──────────────────┐                  │
│  │  Ollama AI   │     │  PostgreSQL     │                   │
│  │  (Local LLM) │     │  + PostGIS      │                   │
│  └─────────────┘     └──────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- [Ollama](https://ollama.ai/) (for local AI)
- PostgreSQL + PostGIS (optional, SQLite used by default)

### 1️⃣ One-Click Setup
```bash
cd crafty-gis
chmod +x setup.sh
./setup.sh
```

### 2️⃣ Or Manual Setup

**Backend:**
```bash
cd crafty-gis-server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Pull AI model
ollama pull llama3.1:8b

# Start server
python -m app.main
```

**Frontend:**
```bash
cd crafty-gis-client
npm install
npm run dev
```

### 3️⃣ Open Browser
Navigate to **http://localhost:3000**

---

## 🧪 Supported Analysis Types

| Analysis | Description | Data Sources | Tools |
|----------|-------------|--------------|-------|
| **LULC Classification** | Land use/land cover mapping | Sentinel-2, Landsat | Random Forest, GDAL |
| **Vegetation Indices** | NDVI, EVI, SAVI, NDWI | Sentinel-2, Landsat, MODIS | Rasterio, Python |
| **Change Detection** | Multi-temporal analysis | Sentinel-2, Landsat | Post-classification |
| **Terrain Analysis** | DEM, slope, aspect, hydrology | SRTM | GDAL, SAGA, GRASS |
| **Crop Health** | Crop vigor assessment | Sentinel-2, Landsat | Vegetation indices |
| **Urban Sprawl** | Urban expansion mapping | Landsat, Sentinel, OSM | GeoPandas, Fragstats |
| **Flood Mapping** | Flood extent from SAR/optical | Sentinel-1, Sentinel-2 | GDAL, Rasterio |
| **Land Surface Temp** | LST from thermal bands | Landsat, MODIS | Split-window algorithm |
| **Watershed Delineation** | Hydrological analysis | SRTM | SAGA, GRASS |
| **Landscape Metrics** | Fragmentation analysis | Any classified map | Fragstats, Python |
| **Biomass Estimation** | AGB and carbon stock | Sentinel-2, GEDI | Allometric equations |
| **Soil Moisture** | Surface moisture from SAR | Sentinel-1 | Change detection |

---

## 📡 Data Sources

| Source | Data | Access |
|--------|------|--------|
| Copernicus Sentinel-2 | 13-band optical, 10-60m | Free, open |
| Copernicus Sentinel-1 | C-band SAR | Free, open |
| NASA/USGS Landsat | 30m multispectral (since 1972) | Free, open |
| NASA MODIS | Daily global, 250m-1km | Free, open |
| NASA SRTM | 30m DEM | Free, open |
| OpenStreetMap | Roads, buildings, boundaries | Free, open |
| CHIRPS | Rainfall, 5km, 1981-present | Free, open |
| ERA5 | Climate reanalysis | Free, registration |
| GBIF | Species occurrence data | Free, open |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (React 19, TypeScript) | Dashboard UI |
| **Styling** | Tailwind CSS v4 | Design system |
| **Maps** | MapLibre GL JS | Interactive map |
| **Icons** | Lucide React | Icon library |
| **Backend** | FastAPI (Python 3.11) | API server |
| **AI** | Ollama (Llama 3.1, DeepSeek, Mistral) | Local LLM |
| **Database** | PostgreSQL + PostGIS / SQLite | Spatial data |
| **Processing** | GDAL, Rasterio, GeoPandas | Geospatial ops |
| **Orchestration** | Asyncio, HTTPX | Async processing |
| **Infrastructure** | Docker Compose | Containerization |
| **Desktop** | Tauri (coming soon) | Native packaging |

---

## 📁 Project Structure

```
crafty-gis/
├── crafty-gis-server/          # Python FastAPI backend
│   ├── app/
│   │   ├── api/                # REST endpoints
│   │   ├── core/               # Business logic
│   │   ├── services/           # External integrations
│   │   ├── db/                 # Database models
│   │   └── main.py             # App entry point
│   └── requirements.txt
├── crafty-gis-client/          # Next.js frontend
│   ├── src/
│   │   ├── app/                # Pages & layout
│   │   └── components/         # UI components
│   └── package.json
├── data/                       # Data storage
│   ├── downloads/
│   ├── outputs/
│   └── uploads/
├── docker-compose.yml          # Full stack deployment
└── setup.sh                    # One-click installer
```

---

## 🔄 How It Works

### The AI Investigation Flow
1. **User types** a geospatial problem in plain language
2. **AI asks targeted questions** — location, time period, analysis type, output format
3. **User responds** through hybrid chat + structured wizard
4. **AI builds complete intent** — understands exactly what's needed
5. **Workflow Engine generates tasks** — data download → process → analyze → report
6. **GIS Processor executes** using appropriate tools (GDAL, Rasterio, GeoPandas, etc.)
7. **User can interrupt** at any point to adjust requirements
8. **System regenerates plan** and continues with updated workflow
9. **Results delivered** — maps, reports, raw files, all downloadable

---

## 🗺️ Name Origins

**CRAFTY GIS** — **C**onversational **R**emote **A**nalysis & **F**ield **T**echnology for **G**eographic **I**nformation **S**ystems

Like QGIS (Quantum GIS), ArcGIS (Arc Geographic Information System), GRASS GIS (Geographic Resources Analysis Support System), and SAGA GIS (System for Automated Geoscientific Analyses), CRAFTY GIS follows the tradition of meaningful, functional acronyms.

---

## 📜 License

GNU General Public License v3.0 — see [LICENSE](LICENSE) for details.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 💖 Support

If CRAFTY GIS helps your work or research, consider supporting the project:
- ⭐ Star the repository on GitHub
- 🐛 Report bugs and suggest features via [Issues](https://github.com/virahitvin8/crafty-gis/issues)
- 📢 Share CRAFTY GIS with your network
- 💰 Sponsor via [GitHub Sponsors](https://github.com/sponsors/virahitvin8)

---

<p align="center">
  <b>Built with ❤️ for the open-source geospatial community</b><br>
  <i>"Making Earth observation intelligence accessible to everyone"</i><br>
  <br>
  <a href="https://github.com/virahitvin8/crafty-gis"><b>GitHub</b></a> ·
  <a href="ROADMAP.md"><b>Roadmap</b></a> ·
  <a href="CHANGELOG.md"><b>Changelog</b></a> ·
  <a href="CONTRIBUTING.md"><b>Contributing</b></a>
</p>
