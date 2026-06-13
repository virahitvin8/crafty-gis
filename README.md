<div align="center">

<img src="docs/assets/logo.png" width="150" alt="CRAFTY GIS Logo" />

<!-- CAPSULE RENDER header (kyechan99/capsule-render) -->
<img src="https://capsule-render.vercel.app/api?type=waving&amp;color=0:0c8ee7,50:059669,100:065f46&amp;height=200&amp;section=header&amp;text=CRAFTY%20GIS&amp;fontSize=72&amp;fontColor=fde047&amp;fontAlignY=38&amp;desc=Conversational%20Remote%20Analysis%20and%20Field%20Technology%20for%20GIS&amp;descAlignY=60&amp;descSize=16&amp;animation=fadeIn" width="100%"/>

<!-- PIXEL PROFILE badge row (LuciNyan/pixel-profile style) -->
<br/>

[![GitHub Stars](https://img.shields.io/github/stars/virahitvin8/crafty-gis?style=for-the-badge&logo=starship&color=0c8ee7&labelColor=09090b)](https://github.com/virahitvin8/crafty-gis/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/virahitvin8/crafty-gis?style=for-the-badge&logo=git&color=059669&labelColor=09090b)](https://github.com/virahitvin8/crafty-gis/network)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg?style=for-the-badge&logo=gnu&labelColor=09090b)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge&logo=github&labelColor=09090b)](CONTRIBUTING.md)

<br/>

<!-- BADGES (alexandresanlim/Badges4-README.md-Profile style) -->
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-Local%20AI-FF6B35?style=flat-square&logo=llama&logoColor=white)
![GDAL](https://img.shields.io/badge/GDAL-Geospatial-5CAD00?style=flat-square&logo=qgis&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Android%20Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)
![Open Source](https://img.shields.io/badge/100%25-Open%20Source-00b4d8?style=flat-square&logo=opensourceinitiative&logoColor=white)

<br/>

> *"You describe the problem. CRAFTY GIS solves it."*
> 
> **The only GIS platform where your expertise is optional — the AI's isn't.**

</div>

---

<!-- CAPSULE RENDER divider (kyechan99/capsule-render) -->
<img src="https://capsule-render.vercel.app/api?type=rect&color=0:0c8ee7,100:059669&height=2&section=header" width="100%"/>

## 🌍 What is CRAFTY GIS?

**CRAFTY GIS** stands for **C**onversational **R**emote **A**nalysis & **F**ield **T**echnology for **G**eographic **I**nformation **S**ystems.

It is a **free, open-source, AI-powered geospatial intelligence platform** that makes satellite data analysis and GIS problem-solving accessible to **everyone** — researchers, students, farmers, businesses, and government officers.

Unlike traditional GIS software (ArcGIS, QGIS) that gives you *tools* and expects you to know what to do — **CRAFTY GIS listens to your problem**, asks smart clarifying questions, and then **automatically orchestrates** the entire analysis workflow: from data download to final report.

```text
┌─ You type ─────────────────────────────────────────────────────────────────┐
│  "Calculate the present NDVI for crop health in Tirupati district"         │
└────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─ AI Investigates ──────────────────────────────────────────────────────────┐
│  "Extracting Tirupati coordinates..." → "Latest Sentinel-2 imagery?"       │
└────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─ System Orchestrates ──────────────────────────────────────────────────────┐
│  Downloads Sentinel-2 → Preprocesses NIR/Red Bands → Calculates NDVI       │
└────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─ You Receive ──────────────────────────────────────────────────────────────┐
│  📄 PDF Report   🗺️ GeoTIFF Maps   📊 CSV Statistics   📦 Raw Files        │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Capabilities

<table>
<tr>
<td width="50%">

### 🧠 AI Investigation System
Hybrid chat + structured wizard. Asks ONE question at a time to understand exactly what you need. No GIS expertise required — describe in plain language.

### 📋 Automated Workflow Engine
Generates a task plan from your description, executes it step-by-step, and lets you **interrupt mid-analysis** to adjust anytime.

### 🌐 Multi-Source Data Download
Automatically fetches from **Sentinel-1/2, Landsat 8/9, MODIS, SRTM, CHIRPS, ERA5, OSM, Bhoonidhi (ISRO), Survey of India** — all free and open.

### 🔧 Multi-Tool Processing
Routes analysis to **GDAL, GeoPandas, Rasterio, QGIS, SAGA GIS, GRASS GIS, Fragstats** as needed — automatically.

</td>
<td width="50%">

### 📄 Auto-Report Generator
Generates professional **PDF, HTML, and Markdown** reports with maps, statistics, and interpretation text. Ready to submit.

### 🔄 Mid-Workflow Interruption
At any point, click **"Adjust"**, type new instructions — the system updates the plan, preserves completed work, and continues.

### 💾 All Outputs Downloadable
Maps (PNG/GeoTIFF), reports (PDF/HTML), shapefiles (.shp), CSVs — organized and downloadable from the dashboard.

### 🤖 100% Free AI — No API Bills
Runs on **Ollama** (local) → **LM Studio** → **Hugging Face free API**. Zero paid keys. Zero rate limits that stop your work.

</td>
</tr>
</table>

---

## 🚀 Quick Start — One Command

> **Everything works with a single command. That's the whole point.**

### 🐧 Linux
```bash
git clone https://github.com/virahitvin8/crafty-gis.git
cd crafty-gis
chmod +x start.sh
./start.sh
```

### 🪟 Windows
```batch
git clone https://github.com/virahitvin8/crafty-gis.git
cd crafty-gis
start.bat
```

### 📱 Android (Install as App)
```text
To access CRAFTY GIS on your phone, both devices must be on the same WiFi.
1. Find your PC's IP address (e.g., 192.168.1.5).
2. Open Chrome on your Android device and go to: http://192.168.1.5:3000
   (Do NOT use localhost:3000 on your phone, it will show an error).
3. Tap the ⋮ menu → "Add to Home Screen".
4. CRAFTY GIS is now installed like a native app!
```

> ✅ The script installs Python deps, Node packages, sets up the database,
> starts the backend (port 8000) and frontend (port 3000) — all automatically.

### 🌐 Access Points

| Service | URL |
|:--------|:----|
| **Dashboard** | http://localhost:3000 |
| **API** | `http://localhost:8000` *(Must be running `./start.sh` first)* |
| **API Docs** | `http://localhost:8000/docs` *(Must be running `./start.sh` first)* |
| **AI Status** | `http://localhost:8000/api/ai/status` *(Must be running `./start.sh` first)* |

---

## 🤖 AI Setup (Free, No Credit Card)

CRAFTY GIS uses **only free and open-source AI**. Pick any one:

### Option 1: Ollama (Recommended — Local, Unlimited)
```bash
# 1. Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh     # Linux
# Windows: download from https://ollama.ai

# 2. Start the server (Keep this running in a separate terminal)
ollama serve

# 3. Download a free model
ollama pull llama3
```
**How to configure:** Open `crafty-gis-server/.env` and ensure it has:
`OLLAMA_BASE_URL=http://localhost:11434`
`OLLAMA_MODEL=llama3`

### Option 2: Hugging Face (Free Cloud — No Install)
```text
1. Register for free: https://huggingface.co/join
2. Get your free token: https://huggingface.co/settings/tokens
3. Open the file `crafty-gis-server/.env`
4. Find the line `HUGGINGFACE_TOKEN=` and paste your token:
   HUGGINGFACE_TOKEN=hf_your_free_token_here
```

### Option 3: LM Studio (Local GUI — Easiest for Beginners)
```text
1. Download free: https://lmstudio.ai
2. Search and download any model (e.g., "Mistral 7B")
3. Click the "Start Local Server" button in LM Studio.
4. Open the file `crafty-gis-server/.env`.
5. Ensure the LM Studio URL matches:
   LMSTUDIO_URL=http://localhost:1234/v1/chat/completions
```

---

## 🛰️ Supported Data Sources

| Satellite / Source | Data | Resolution | Cost | Portal |
|:------------------|:-----|:-----------|:-----|:-------|
| 🛰️ **Sentinel-2** | 13-band optical (NDVI, LULC) | 10–60m | Free | [Copernicus](https://dataspace.copernicus.eu) |
| 🛰️ **Sentinel-1** | SAR all-weather radar | 5–40m | Free | [Copernicus](https://dataspace.copernicus.eu) |
| 🛰️ **Landsat 8/9** | Multispectral history (1972–) | 30m | Free | [USGS](https://earthexplorer.usgs.gov) |
| 🛰️ **MODIS** | Daily global coverage | 250m–1km | Free | [NASA](https://earthdata.nasa.gov) |
| ⛰️ **SRTM DEM** | Digital elevation model | 30m | Free | [NASA](https://earthdata.nasa.gov) |
| 🇮🇳 **Bhoonidhi** | ISRO Indian satellite data | Variable | Free | [NRSC](https://bhoonidhi.nrsc.gov.in) |
| 🗺️ **Survey of India** | India topographic maps | Variable | Free | [SOI](https://onlinemaps.surveyofindia.gov.in) |
| 🌧️ **CHIRPS** | Rainfall (1981–present) | 5km | Free | [CHRS](https://chrs.web.uci.edu) |
| 🌡️ **ERA5** | Climate reanalysis (1940–) | 31km | Free | [ECMWF](https://cds.climate.copernicus.eu) |
| 🗺️ **OpenStreetMap** | Roads, buildings, boundaries | Vector | Free | [OSM](https://www.openstreetmap.org) |
| 🐾 **GBIF** | Biodiversity occurrence records | Point data | Free | [GBIF](https://www.gbif.org) |

---

## 🔬 Supported Analysis Types

<table>
<tr><th>Analysis</th><th>Description</th><th>Tools Used</th></tr>
<tr><td>🌿 LULC Classification</td><td>Land use / land cover mapping</td><td>Sentinel-2, Random Forest, GDAL</td></tr>
<tr><td>🌱 Vegetation Indices</td><td>NDVI, EVI, SAVI, NDWI</td><td>Sentinel-2, Rasterio, NumPy</td></tr>
<tr><td>🔄 Change Detection</td><td>Multi-temporal land change analysis</td><td>Landsat time series</td></tr>
<tr><td>⛰️ Terrain Analysis</td><td>DEM, slope, aspect, watershed</td><td>SRTM, SAGA GIS, GRASS GIS</td></tr>
<tr><td>🌾 Crop Health</td><td>Agricultural crop vigor assessment</td><td>Sentinel-2, Bhoonidhi</td></tr>
<tr><td>🏙️ Urban Sprawl</td><td>Urban expansion and built-up mapping</td><td>Landsat, Fragstats</td></tr>
<tr><td>🌊 Flood Mapping</td><td>Flood extent from SAR + optical</td><td>Sentinel-1, GDAL</td></tr>
<tr><td>🌡️ Land Surface Temp</td><td>LST from thermal infrared bands</td><td>Landsat Band 10, Python</td></tr>
<tr><td>💧 Watershed Delineation</td><td>Hydrological basin analysis</td><td>SRTM, SAGA GIS</td></tr>
<tr><td>📊 Landscape Metrics</td><td>Fragmentation & pattern stats</td><td>Classified map, Fragstats</td></tr>
<tr><td>🌳 Biomass Estimation</td><td>Above-ground carbon stock</td><td>Sentinel-2, GEDI, Python</td></tr>
<tr><td>🧪 Soil Moisture</td><td>Surface moisture from SAR</td><td>Sentinel-1, Change detection</td></tr>
</table>

---

## 🏗️ Architecture

```text
╔══════════════════════════════════════════════════════════════════╗
║                     CRAFTY GIS Platform                          ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌──────────────────────┐     ┌───────────────────────────────┐  ║
║  │  Next.js 16 Frontend │     │   FastAPI Python Backend      │  ║
║  │  (React 19, TS, PWA) │────▶│                               │  ║
║  │                      │     │  ┌─────────────────────────┐  │  ║
║  │  📱 Android PWA      │     │  │ AI Investigation System │  │  ║
║  │  🪟 Windows          │     │  │ (Ollama / HuggingFace)  │  │  ║
║  │  🐧 Linux            │     │  └─────────────────────────┘  │  ║
║  └──────────────────────┘     │                               │  ║
║                               │  ┌─────────────────────────┐  │  ║
║  ┌──────────────────────┐     │  │  Workflow Engine        │  │  ║
║  │  MapLibre GL JS      │◀────│  │  (Task Planner)         │  │  ║
║  │  Interactive Map     │     │  └─────────────────────────┘  │  ║
║  └──────────────────────┘     │                               │  ║
║                               │  ┌─────────────────────────┐  │  ║
║  ┌──────────────────────┐     │  │  GIS Processor          │  │  ║
║  │  SQLite (dev)        │◀────│  │  GDAL·Rasterio·GeoPandas│  │  ║
║  │  PostgreSQL+PostGIS  │     │  │ SAGA GIS·GRASS·Fragstats│  │  ║
║  │  (production)        │     │  └─────────────────────────┘  │  ║
║  └──────────────────────┘     │                               │  ║
║                               │  ┌─────────────────────────┐  │  ║
║                               │  │  Data Downloader        │  │  ║
║                               │  │  Sentinel·Landsat·MODIS │  │  ║
║                               │  │  SRTM·OSM·Bhoonidhi     │  │  ║
║                               │  └─────────────────────────┘  │  ║
║                               └───────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 🗂️ Project Structure

```
crafty-gis/
├── 📁 crafty-gis-server/           # Python FastAPI Backend
│   ├── app/
│   │   ├── api/                    # REST endpoints
│   │   │   ├── chat.py             # AI chat & investigation
│   │   │   ├── analysis.py         # NDVI, LULC, terrain, etc.
│   │   │   ├── data.py             # Satellite data download
│   │   │   └── projects.py         # Project CRUD
│   │   ├── core/                   # Business logic
│   │   │   ├── ai_investigator.py  # Hybrid AI conversation
│   │   │   ├── workflow_engine.py  # Task planning & execution
│   │   │   ├── gis_processor.py    # Multi-tool GIS dispatch
│   │   │   └── report_generator.py # PDF/HTML/MD reports
│   │   ├── services/               # External integrations
│   │   │   ├── groq_service.py     # Free AI backends
│   │   │   ├── ollama_service.py   # Ollama local LLM
│   │   │   └── data_downloader.py  # Satellite download engine
│   │   └── config.py               # All settings & credentials
│   ├── requirements.txt
│   ├── .env                        # Your credentials (gitignored)
│   └── .env.example                # Safe template (pushed to GitHub)
│
├── 📁 crafty-gis-client/           # Next.js Frontend Dashboard
│   ├── src/app/
│   │   ├── page.tsx                # Main dashboard (Chat/Workflow/Files)
│   │   ├── layout.tsx              # PWA meta tags, Inter font
│   │   └── globals.css             # Design system
│   └── public/
│       ├── manifest.json           # Android PWA manifest
│       └── sw.js                   # Service worker (offline)
│
├── 📁 .github/workflows/           # CI/CD (GitHub Actions)
│   ├── ci.yml                      # Test on push
│   └── release.yml                 # Build & release
│
├── 🚀 start.sh                     # ONE COMMAND — Linux/Android
├── 🚀 start.bat                    # ONE COMMAND — Windows
├── 📋 QUICKSTART.md                # Beginner guide
├── 🤝 CONTRIBUTING.md
├── 📜 LICENSE (GPL v3)
└── 📖 README.md
```

---

## 💻 Tech Stack

| Layer | Technology | Why Free & Open Source |
|:------|:-----------|:----------------------|
| **Frontend** | Next.js 16 + React 19 + TypeScript | MIT License |
| **Styling** | Tailwind CSS v4 | MIT License |
| **Maps** | MapLibre GL JS | BSD License |
| **Backend** | FastAPI + Python 3.11 | MIT License |
| **AI (Local)** | Ollama + Llama 3 / Mistral | MIT + Apache 2.0 |
| **AI (Cloud)** | Hugging Face free API | Free tier |
| **AI (GUI)** | LM Studio | Free app |
| **Database** | SQLite / PostgreSQL+PostGIS | Free & Open Source |
| **Geospatial** | GDAL, Rasterio, GeoPandas | MIT/LGPL |
| **GIS Tools** | QGIS, SAGA GIS, GRASS GIS | GPL |
| **Reports** | ReportLab, WeasyPrint, Jinja2 | BSD/GPL |
| **Container** | Docker + Docker Compose | Apache 2.0 |

---

## 📊 GitHub Stats

<!-- github-readme-stats (anuraghazra/github-readme-stats) -->
<div align="center">

<img src="https://github-readme-stats.vercel.app/api?username=virahitvin8&show_icons=true&theme=tokyonight&hide_border=true&bg_color=09090b&title_color=0c8ee7&icon_color=059669&text_color=e4e4e7&ring_color=0c8ee7" height="165"/>

<img src="docs/assets/logo.png" height="165" alt="CRAFTY GIS Logo" style="margin: 0 10px;" />

<img src="https://github-readme-stats.vercel.app/api/top-langs/?username=virahitvin8&layout=compact&theme=tokyonight&hide_border=true&bg_color=09090b&title_color=0c8ee7&text_color=e4e4e7&langs_count=8" height="165"/>

</div>

---

## 🔄 How the AI Investigation Works

The core of CRAFTY GIS is the **AI Investigation System** — a conversational layer that acts like a GIS consultant **before** running any analysis.

```text
User: "I want to analyze forest cover change in my area"
  │
  ▼  PHASE 1 — Problem Understanding
  │   AI: "Which district or region?"
  │   AI: "What time period — 2010 to 2024?"
  │   AI: "Do you need annual maps or start vs end?"
  │   AI: "Output as PDF report, shapefile, or both?"
  │
  ▼  PHASE 2 — Plan Generation (shown in Workflow Panel)
  │   ✓ Task 1: Download study area boundary (OSM)
  │   ✓ Task 2: Fetch Sentinel-2 / Landsat imagery
  │   ✓ Task 3: Preprocess + cloud mask
  │   ✓ Task 4: LULC classification
  │   ✓ Task 5: Change detection analysis
  │   ✓ Task 6: Landscape metrics (Fragstats)
  │   ✓ Task 7: Generate PDF report + maps
  │
  ▼  PHASE 3 — User Confirmation
  │   User reviews the plan → approves or adjusts
  │   "Also add water body layer" → Plan updates instantly
  │
  ▼  PHASE 4 — Automated Execution + Real-time Progress
  │   Live progress shown in Workflow Panel
  │   User can interrupt at any point to add instructions
  │
  ▼  Results delivered → Maps, Reports, Raw Files ready to download
```

---

## 🧪 Running Tests

```bash
cd crafty-gis-server
pip install pytest pytest-anyio httpx
python -m pytest tests/ -v
```

> 28 tests covering health endpoints, analysis API, chat session flow, project CRUD, and data source APIs.

---

## 🗺️ Roadmap

| Version | Codename | Focus | Status |
|:--------|:---------|:------|:-------|
| **v1.0** | **Gaia** | Core AI + GIS + Dashboard + PWA | ✅ Current |
| **v1.5** | **Terra** | QGIS/SAGA plugin integration + Auth | 🔵 Q3 2026 |
| **v2.0** | **Orbis** | Multi-agent AI + Real-time collab | 🟡 Q4 2026 |
| **v3.0** | **Sage** | OSGeo incubation + ML pipeline | 🔴 Q1 2027 |

---

## 🤝 Contributing

We welcome **everyone** — GIS professionals, Python developers, frontend engineers, documentation writers, and researchers.

| Who You Are | How to Help |
|:------------|:------------|
| 🗺️ GIS Professional | Improve processing algorithms & add new analysis types |
| 🐍 Python Developer | Contribute to backend API & GIS processor |
| ⚛️ Frontend Dev | Enhance dashboard UI, map components & mobile UX |
| 📚 Documentation | Improve guides, write tutorials, translate docs |
| 🧪 Researcher | Test analyses, report bugs, validate outputs |

→ Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## ❓ FAQ

<details>
<summary><strong>Do I need GIS expertise to use CRAFTY GIS?</strong></summary>
<br/>
No. Just describe your problem in plain language. The AI Investigation System asks targeted questions and handles all the technical work. A farmer, a student, and a PhD researcher can all use it equally well.
</details>

<details>
<summary><strong>Is it really free? No hidden costs?</strong></summary>
<br/>
Yes — 100% free and open-source (GPL v3). The AI runs locally via Ollama (free, unlimited). The satellite data comes from free government portals (ESA, NASA, USGS, ISRO). No subscriptions, no API bills, no rate limits that stop your work mid-analysis.
</details>

<details>
<summary><strong>Does it work offline?</strong></summary>
<br/>
Yes for AI and analysis (Ollama runs offline). Internet is only required for downloading new satellite imagery from Copernicus/NASA/USGS.
</details>

<details>
<summary><strong>Can I use it on Android?</strong></summary>
<br/>
Yes! Open http://localhost:3000 in Chrome on your Android device → Tap ⋮ → "Add to Home Screen". CRAFTY GIS installs as a Progressive Web App and works just like a native Android app.
</details>

<details>
<summary><strong>What's the difference from Google Earth Engine?</strong></summary>
<br/>
Google Earth Engine is a cloud platform for large-scale analysis — you need to code it yourself. CRAFTY GIS is an AI consultant — you describe the problem and it does everything. Think of it as "Earth Engine with a brain that asks the right questions."
</details>

<details>
<summary><strong>Can I download and edit the raw output files?</strong></summary>
<br/>
Yes. Every generated file (GeoTIFF, shapefile, PDF, CSV) is downloadable from the Outputs panel. You can open them in ArcGIS, QGIS, or any GIS software for manual editing.
</details>

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0**.

This means you can use, study, modify, and distribute CRAFTY GIS freely — as long as you keep it open source.

→ See [LICENSE](LICENSE) for full details.

---

<!-- CAPSULE RENDER footer wave (kyechan99/capsule-render) -->
<img src="https://capsule-render.vercel.app/api?type=waving&amp;color=0:065f46,50:059669,100:0c8ee7&amp;height=120&amp;section=footer&amp;text=Conversational%20Remote%20Analysis%20and%20Field%20Technology&amp;fontSize=24&amp;fontColor=fde047" width="100%"/>

<div align="center">

<img src="docs/assets/logo.png" width="100" alt="CRAFTY GIS Logo" />

**Built with ❤️ for the open-source geospatial community**

*"Making Earth observation intelligence accessible to everyone"*

[GitHub](https://github.com/virahitvin8/crafty-gis) · [Issues](https://github.com/virahitvin8/crafty-gis/issues) · [Discussions](https://github.com/virahitvin8/crafty-gis/discussions) · [Contributing](CONTRIBUTING.md)

<sub>© 2024–2026 <a href="https://github.com/virahitvin8">Neelam Akshit Vinay</a> and CRAFTY GIS Contributors · GPL v3</sub>

</div>
