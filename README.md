<div align="center">

# 🛰️ Crafty GIS — Satellite Crop Monitor

### *Advanced Satellite Vision for Precision Agriculture*

**Real-time, pixel-level crop health monitoring and analytics — from space to your pocket 🛰️🌾**

<br>

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://javascript.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Ollama](https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.ai)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**🆓 100% Open-Source Stack • Runs 24×7 Free • Zero API Costs**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🛰️ How It Works](#️-how-it-works)
- [🆓 100% Open-Source Stack](#-100-open-source-stack-primary--legacy-fallbacks)
- [🚀 Quick Start](#-quick-start)
- [🔧 Deployment Guide](#-deployment-guide)
  - [Option 1: Local Development Server](#option-1-local-development-server)
  - [Option 2: Docker (Any Cloud)](#option-2-docker-any-cloud)
  - [Option 3: Google Cloud Run (Recommended)](#option-3-google-cloud-run-recommended)
  - [Option 4: Static Hosting (Netlify / Vercel / GitHub Pages)](#option-4-static-hosting-netlify--vercel--github-pages)
  - [Option 5: Android App (Capacitor)](#option-5-android-app-capacitor)
  - [🔥 NEW: Coolify / Dokploy (24×7 self-hosted)](COOLIFY_DEPLOY.md)
- [🔐 Authentication & API Keys](#-authentication--api-keys)
- [📡 Satellite Data Sources](#-satellite-data-sources)
- [🏞️ Land Records (Survey/Khata number)](#️-land-records-survey--khata-number)
- [🗺️ Map Layers & Indices](#️-map-layers--indices)
- [📁 Project Structure](#-project-structure)
- [🔧 Troubleshooting](#-troubleshooting)
- [📜 License](#-license)

---

## ✨ Features

| | Feature | Description | Powered By |
|---|---|---|---|
| 🛰️ | **Multi-Satellite Analysis** | Sentinel-2, Sentinel-1 SAR, Landsat-8 Thermal | ESA + NASA |
| 🌿 | **7 Crop Health Indices** | NDVI, EVI, NDWI, GNDVI, NDRE, SAVI, NDMI | Sentinel Hub API |
| 🌾 | **Yield Prediction** | Real-time yield projection per hectare | Custom Algorithm |
| 🐛 | **Pest Risk Detection** | Anomaly detection from Red-Edge/NIR spectral drops | Evalscript |
| 🌡️ | **Thermal Stress (TVDI)** | Land Surface Temperature via Landsat-8 | Landsat L1C |
| 💧 | **SAR Soil Moisture** | Soil moisture via Sentinel-1 radar (works through clouds!) | Sentinel-1 GRD |
| 🤖 | **AI Agronomist** | DeepSeek LLM-powered personalized field advice | Ollama (self-hosted, free) |
| 📷 | **Crop Photo Diagnosis** | LLaVA vision AI detects diseases/pests from photos | Ollama + LLaVA (self-hosted) |
| 🌤️ | **Live Weather** | 7-day forecast, soil temp/moisture, evapotranspiration | Open-Meteo |
| ⛰️ | **Terrain Analysis** | Elevation, slope, drainage class | Open-Meteo + SRTM |
| 🌱 | **Soil Properties** | pH, organic carbon, texture, nitrogen | SoilGrids |
| 📊 | **Time Series** | Track NDVI changes over time with change detection | Sentinel Hub Stats |
| 🚇 | **Guided Onboarding** | 8-step metro tour walks new users through first analysis | Interactive UI |
| 📚 | **Education Module** | 8 remote sensing lessons + 10-question knowledge quiz | Built-in |
| 📱 | **PWA + Android** | Installs as native app, works offline | Capacitor + Service Worker |
| 🔒 | **Self-Hosted Auth** | Optional authentik SSO (replaces Firebase) | authentik (open-source) |
| 📡 | **STAC/Open Data Cube** | Alternative to Sentinel Hub (free satellite data) | Copernicus + Planetary Computer |

---

## 🛰️ How It Works

```
📍 Draw/Select Field → 🛰️ Fetch Satellite Data → 📊 Compute Indices → 🤖 AI Advice → 📱 Dashboard
```

**Data Pipeline:**
1. **Select your field** — Enter GPS coordinates, click on map, upload KML/GeoJSON, or walk with GPS
2. **Scene discovery** — STAC API searches Sentinel-2 archives for recent cloud-free scenes
3. **Satellite processing** — Sentinel Hub Process API computes vegetation indices
4. **Weather + Soil** — Open-Meteo (live weather) + SoilGrids (soil properties)
5. **AI agronomist** — Gemini generates personalized farming recommendations
6. **Reporting** — Health scores, yield estimates, pest risk, alerts, time series

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ and **npm**
- Modern web browser (Chrome, Firefox, Edge)
- Internet connection for satellite API calls

### 1. Clone & Install
```bash
git clone https://github.com/virahitvin8/crafty_gis.git
cd crafty_gis

# Install server dependencies (required)
cd server && npm install && cd ..

# Install frontend dependencies (optional - only for Android/Capacitor builds)
# The frontend is vanilla JS - no build step needed!
# npm install
```

### 2. Run Locally
```bash
# Start the server (serves both API and frontend)
node server/server.js
```

Open **http://localhost:3001** in your browser.

### 3. Login
| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `admin` |
| **User** | `user` | `user` |

### 4. Configure API Keys (Optional)
Log in as **Admin**, open **Settings**, and add:
- **Gemini API Key** — for AI advice ([get free key](https://aistudio.google.com/app/apikey))
- **Sentinel Hub credentials** — override defaults if needed
- **Alert phone number** — for SMS/WhatsApp notifications

---

## 🆓 100% Open-Source Stack (Primary) + Legacy Fallbacks

Crafty GIS runs on a **primary → fallback** architecture: the free open-source services are used first, and the legacy cloud services only kick in if a new service is unreachable. **Nothing is broken — everything is additive.**

| Feature | 🆓 New (PRIMARY) | Legacy (FALLBACK) |
|---|---|---|
| **Satellite data** | Open Data Cube + STAC API, Google Earth Engine | Sentinel Hub |
| **AI agronomy advice** | Ollama + DeepSeek-R1 (self-hosted) | Gemini API |
| **Crop photo diagnosis** | LLaVA vision model (self-hosted) | — (new feature) |
| **Authentication** | authentik / Authelia (self-hosted SSO) | Firebase Auth |
| **Hosting** | Coolify / Dokploy (24×7, $5-10/mo) | Render |
| **Monitoring** | Uptime Kuma (self-hosted) | — |
| **Offline backup** | `getFallbackAdvice()` — always available | — |

### Quick start (self-hosted stack)

```bash
# Option A — all services via Docker Compose (recommended)
docker compose -f docker-compose.coolify.yml up -d

# Option B — one-liner install of Ollama for AI advice only
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull deepseek-r1:7b
ollama pull llava-phi3      # for photo diagnosis

# Then just run the app as usual:
node server/server.js
```

> 📘 Full docs: [`COOLIFY_DEPLOY.md`](COOLIFY_DEPLOY.md) · [`DEPLOYMENT.md`](DEPLOYMENT.md) · [`SELFHOST_MIGRATION.md`](SELFHOST_MIGRATION.md)

---

## 🔧 Deployment Guide

### Option 1: Local Development Server

**Quickest way** to get started - runs on your machine.

```bash
# From project root
node server/server.js
# → http://localhost:3001
```

The server:
- Serves the static frontend (`index.html`, `js/`, `css/`)
- Provides the GEE proxy API at `/api/gee/*`
- Uses port 3001 by default (override with `PORT` env var)

```bash
# Custom port
PORT=8080 node server/server.js
```

---

### Option 2: Docker (Any Cloud)

**Best for**: Portability across any cloud provider (AWS ECS, Azure, GCP, DigitalOcean, etc.)

#### Build the image
```bash
docker build -t crafty_gis:latest .
```

#### Run locally
```bash
docker run -p 8080:8080 crafty_gis:latest
# → http://localhost:8080
```

#### Push to container registry
```bash
# Docker Hub
docker tag crafty_gis:latest yourusername/crafty_gis:latest
docker push yourusername/crafty_gis:latest

# Google Container Registry
docker tag crafty_gis:latest gcr.io/your-project/crafty_gis:latest
docker push gcr.io/your-project/crafty_gis:latest

# AWS ECR
docker tag crafty_gis:latest your-account.dkr.ecr.region.amazonaws.com/crafty_gis:latest
docker push your-account.dkr.ecr.region.amazonaws.com/crafty_gis:latest
```

#### Deploy to any container platform
```bash
# AWS ECS (via CLI)
aws ecs run-task --cluster your-cluster --task-definition crafty_gis

# Azure Container Instances
az container create --resource-group your-rg --name crafty_gis \
  --image your-registry/crafty_gis:latest --ports 8080

# DigitalOcean App Platform
# → Point to your container registry via the dashboard
```

**Dockerfile details:**
- Multi-stage build (smaller final image)
- Node.js 20 slim base image
- Health check on `/api/gee/health`
- Exposes port 8080 (configurable via `PORT` env)

---

### Option 3: Google Cloud Run (Recommended)

**Best for**: Fully managed, auto-scaling, HTTPS, custom domain, pay-per-use.

#### Prerequisites
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
- [Docker](https://docker.com) installed
- A Google Cloud project with [billing enabled](https://cloud.google.com/billing/docs/how-to/modify-project)

#### Method A: One-click deploy (PowerShell - Windows)
```powershell
.\deploy.ps1 -ProjectId "your-project-id" -Region "us-central1"
```

#### Method B: Manual deploy (Linux/Mac/Windows)
```bash
# 1. Authenticate
gcloud auth login
gcloud config set project your-project-id
gcloud auth configure-docker

# 2. Build & push image
docker build -t gcr.io/your-project-id/crafty_gis:latest .
docker push gcr.io/your-project-id/crafty_gis:latest

# 3. Deploy to Cloud Run
gcloud run deploy crafty_gis \
  --image gcr.io/your-project-id/crafty_gis:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --min-instances 0 \
  --max-instances 2 \
  --timeout 300 \
  --set-env-vars "NODE_ENV=production"
```

#### After deployment
```bash
# Get the URL
gcloud run services describe crafty_gis --region us-central1 \
  --format 'value(status.url)'

# View logs
gcloud logging read "resource.type=cloud_run_revision AND \
  resource.labels.service_name=crafty_gis" --limit 20

# Check health
curl https://crafty_gis-xxxxx-uc.a.run.app/api/gee/health
```

**Cloud Run advantages:**
- Auto-scales to zero when not in use (saves money)
- Built-in HTTPS, custom domains, and CDN
- 2 million requests free per month
- 512Mi memory and 1 vCPU are sufficient

---

### Option 4: Static Hosting (Netlify / Vercel / GitHub Pages)

**Best for**: If you only need the frontend (satellite data still works via Sentinel Hub).

The frontend works standalone because Sentinel Hub API calls go directly from the browser. The server is only needed for the Google Earth Engine proxy.

#### Build static files
```bash
# Linux/Mac
./build.sh
# or web-only:
bash build-web.sh

# Windows PowerShell
.\build-web.ps1
```

Files are output to the `www/` directory.

#### Deploy to Netlify (recommended — config included)
```bash
# Push this repo to GitHub, then:
# 1. app.netlify.com → Add new site → Import from Git
# 2. Netlify auto-detects netlify.toml (builds www/, proxies /api/* to Render)
# 3. Or CLI:
netlify deploy --prod --dir www

# Or drag-and-drop the www/ folder onto https://app.netlify.com/drop
```

The included `netlify.toml` handles the build command, SPA redirects, API proxying to the Render backend, and security headers automatically.

#### Deploy to Vercel (fully serverless — no separate backend needed)

Crafty GIS ships with **Vercel serverless functions** so the whole app runs on
Vercel alone — no Render server required for satellite auth or AI advice.

```bash
# Push to GitHub, then:
# 1. vercel.com → New Project → Import this repo
# 2. Framework preset: Other (static files)
# 3. Add env vars (optional): GEMINI_API_KEY, SENTINEL_HUB_CLIENT_ID, SENTINEL_HUB_CLIENT_SECRET

# Or CLI:
vercel --prod
```

The included `vercel.json` + `api/` folder wire up:
- `api/sentinel-token.js` → Sentinel Hub OAuth proxy (real satellite auth)
- `api/gemini-analysis.js` → Gemini AI advice with expert offline fallback
- SPA rewrites + security headers

> Note: the catch-all rewrite excludes `/api/*` deliberately — in production the
> frontend calls Google Earth Engine through the Render backend URL, so unhandled
> API paths 404 instead of silently serving the SPA.

> **Long-term Google Cloud note:** App Engine Flexible is being sunset by Google
> Cloud. For a forward-looking 24×7 Google deployment, prefer **Cloud Run** via
> `cloudbuild.yaml` — `app.yaml` is still provided for teams already on GAE Flex.

#### Deploy to Google Cloud (App Engine / Cloud Run — 24×7 managed)

```bash
# App Engine Flexible (uses the Dockerfile):
gcloud app deploy app.yaml

# Cloud Run via Cloud Build:
gcloud builds submit --config cloudbuild.yaml .
```

Both run the Node server + frontend 24×7 with health checks and auto-restart.

#### Deploy to GitHub Pages

#### Deploy to Vercel
```bash
# Using Vercel CLI
vercel --prod ./www
```

#### Deploy to GitHub Pages
```bash
# Push the www/ directory to gh-pages branch
git add www/
git commit -m "Build for deployment"
git subtree push --prefix www origin gh-pages
```

Then enable GitHub Pages in your repo Settings → Pages → source: `gh-pages` branch.

**⚠️ Note:** Without the server, the GEE proxy endpoints won't work. The app falls back gracefully to Sentinel Hub API, so core functionality (NDVI, all vegetation indices, weather, soil) still works.

---

### Option 5: Android App (Capacitor)

**Best for**: Native Android app with GPS background tracking, offline support, and Play Store distribution.

#### Prerequisites
- [Android Studio](https://developer.android.com/studio) installed
- Java 17+ SDK
- Android SDK (API 34+)

#### Build steps
```bash
# 1. Install Capacitor CLI
npm install @capacitor/cli @capacitor/core @capacitor/android

# 2. Build web assets
./build.sh

# 3. Sync with Capacitor
npx cap sync android

# 4. Open in Android Studio
npx cap open android

# 5. In Android Studio:
#    - Build → Build Bundle(s) / APK(s)
#    - Build APK(s) for direct installation
#    - Build Bundle(s) for Play Store

# 6. Run on device
npx cap run android
```

#### Android configuration
The `capacitor.config.json` is already configured:
```json
{
  "appId": "com.crafty_gis.app",
  "appName": "Crafty GIS",
  "webDir": "www"
}
```

**Features available on Android:**
- Native GPS background tracking (walk mode)
- Offline map tiles caching
- Push notifications for stress alerts
- Full-screen immersive mode
- Share field reports via Android share sheet

---

## 🔐 Authentication & API Keys

### Sign-in methods (new → fallback)
| Priority | Method | Type | When used |
|---|---|---|---|
| **1 (NEW)** | **authentik** | Self-hosted OIDC SSO | If configured (`localStorage` `fh_authentik_issuer`) |
| **2** | **Google Sign-In** | Firebase Auth | Default — works out of the box |
| **3** | **Built-in roles** | Local demo | Always available |

### Built-in Roles (demo / offline)
| Role | Username | Password | Settings Access |
|------|----------|----------|-----------------|
| **Admin** | `admin` | `admin` | Can view & edit API keys |
| **User** | `user` | `user` | No API key access |

### API Keys (Set in Settings → Admin login)

| Key | Source | Purpose | Required? |
|-----|--------|---------|-----------|
| **Ollama URL/Model** | Self-hosted | AI advice + photo diagnosis (PRIMARY) | ❌ (auto-fallback) |
| **Gemini API Key** | [Google AI Studio](https://aistudio.google.com/app/apikey) | AI fallback if Ollama offline | ❌ (optional) |
| **GEE Service Account** | GCloud IAM | Free satellite indices (PRIMARY) | ❌ (uses Sentinel Hub) |
| **Sentinel Hub Client ID/Secret** | [Sentinel Hub Dashboard](https://www.sentinel-hub.com/) | Satellite data fetch (fallback) | ✅ (default provided) |

### Environment Variables (Server)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `OLLAMA_BASE_URL` | Self-hosted LLM address | `http://localhost:11434` |
| `OLLAMA_MODEL` | Text model | `deepseek-r1:7b` |
| `OLLAMA_VISION_MODEL` | Vision model (photo diagnosis) | `llava-phi3` |
| `GEE_SERVICE_ACCOUNT` | GEE service account email | `(empty)` |
| `GEE_PRIVATE_KEY` | GEE private key | `(empty)` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCloud service account JSON | `~/.config/gcloud/application_default_credentials.json` |
| `NODE_ENV` | Environment mode | `development` |

---

## 📡 Satellite Data Sources

| Provider | Satellite | Type | Resolution | Revisit |
|----------|-----------|------|-----------|---------|
| **Sentinel Hub** | Sentinel-2 (ESA) | Multispectral | 10-20m | 5 days |
| **Sentinel Hub** | Landsat-8 (NASA) | Thermal | 30-100m | 16 days |
| **Sentinel Hub** | Sentinel-1 (ESA) | SAR Radar | 10m | 6-12 days |
| **Google Earth Engine** | Sentinel-2 L2A | Multispectral | 10m | 5 days |
| **STAC API** | Sentinel-2 L2A | Scene Catalog | — | — |
| **Open-Meteo** | Weather data | Meteorological | 1km | Hourly |
| **SoilGrids** | Soil properties | Soil maps | 250m | Static |
| **Nominatim** | Reverse geocoding | Address lookup | — | — |

**STAC scene discovery** now queries two free, open catalogs in order: **AWS Element84 Earth Search** → **Microsoft Planetary Computer** (Sentinel-2 L2A). If both fail, it falls back to rolling date candidates (NDVI still comes from Sentinel Hub/GEE). No API key required.

---

## 🏞️ Land Records (Survey / Khata number)

After you draw/select a field boundary, the **Land Info** card:

1. **Auto-detects** State, District, Tehsil, Village and PIN code (via Nominatim reverse geocoding)
2. **Deep-links to the correct official state portal** — all **36 Indian states/UTs are mapped** (UP Bhulekh, MP Bhulekh, MahaBhumi, Dharani, Mee Bhoomi, BanglarBhumi, Jamabandi, …)
3. Guides you through the official **khatauni/jamabandi** lookup flow (District → Tehsil → Village → Khata/Khasra)

> ⚠️ **Honest note:** Owner names are legally protected — official portals require **OTP from the registered mobile** before showing them. Crafty GIS **never invents** survey/khata/owner records. You enter what you verified, it saves locally, and it auto-fills for that field next time.

Supported portals (subset):

| State | Portal | Record type |
|---|---|---|
| Uttar Pradesh | `upbhulekh.gov.in` | Khatauni / Khasra |
| Madhya Pradesh | `mpbhulekh.gov.in` | Khasra |
| Maharashtra | `bhulekh.mahabhumi.gov.in` | 7/12 extract |
| Karnataka | `landrecords.karnataka.gov.in` | Bhoomi RTC |
| Telangana | `dharani.telangana.gov.in` | Dharani |
| Andhra Pradesh | `meebhoomi.ap.gov.in` | Mee Bhoomi |
| Tamil Nadu | `eservices.tn.gov.in` | Patta / Chitta |
| …all others… | *auto-detected from location* | — |

---

## 🗺️ Map Layers & Indices

### Vegetation Health
| Layer | Formula | Best For |
|-------|---------|----------|
| **NDVI** | `(NIR - Red) / (NIR + Red)` | General vegetation greenness |
| **EVI** | `2.5 × (NIR - Red) / (NIR + 6×Red - 7.5×Blue + 1)` | Dense canopies |
| **SAVI** | `1.5 × (NIR - Red) / (NIR + Red + 0.5)` | Sparse vegetation |
| **GNDVI** | `(NIR - Green) / (NIR + Green)` | Chlorophyll / Nitrogen |
| **NDRE** | `(NIR - Red Edge) / (NIR + Red Edge)` | Mid-late season monitoring |

### Moisture & Stress
| Layer | Formula | Detects |
|-------|---------|---------|
| **NDMI** | `(NIR - SWIR) / (NIR + SWIR)` | Leaf water content (stress 3-5 days early) |
| **NDWI** | `(Green - NIR) / (Green + NIR)` | Open water / wet surfaces |
| **SMMI** | SAR backscatter algorithm | Soil moisture (through clouds!) |
| **TVDI** | Temperature-Vegetation index | Thermal drought stress |
| **Pest Alert** | Red-Edge anomaly detection | Pre-visual pest/disease |

---

## 📁 Project Structure

```
crafty_gis/
├── index.html              # Main application
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline)
├── css/style.css           # Complete design system
├── js/
│   ├── config.js           # Credentials, constants, API endpoints
│   ├── utils.js            # DOM helpers, geometry, fetch wrapper
│   ├── api.js              # All API integrations
│   ├── map.js              # Leaflet map, drawing, GPS
│   ├── ui.js               # Rendering, modals, learning, onboarding
│   ├── analysis.js         # Analysis pipeline, yield, alerts
│   └── app.js              # Orchestrator (FH global API)
├── server/
│   ├── server.js           # Express server + GEE proxy
│   └── package.json        # Server dependencies
├── Dockerfile              # Container configuration
├── build.sh                # Linux/Mac build script
├── build-web.ps1           # Windows build script
├── deploy.ps1              # Cloud Run deploy script (Windows)
├── capacitor.config.json   # Android/Capacitor config
├── .env.example            # Example environment variables
└── LICENSE                 # MIT license
```

---

## 🔧 Troubleshooting

### Server won't start
- **Check Node.js version**: `node --version` (needs v18+)
- **Missing dependencies**: Run `cd server && npm install`
- **Port in use (EADDRINUSE)**: `Error: listen EADDRINUSE: address already in use :::3001` means another process is on port 3001
  ```bash
  lsof -i :3001
  kill -9 <PID>
  # Or kill all node servers:
  pkill -f 'node server/server.js'
  ```
- **GEE timeout**: Server adds 15s timeout for GEE init - if it fails, health returns `disconnected` but frontend still works
- **Server log**: Check `/tmp/fh-server.log` for detailed startup errors

### Satellite data not loading
- **Check internet connection** (Sentinel Hub API requires internet)
- **Invalid credentials**: Log in as admin/admin and check Settings
- **No scenes found**: Increase cloud cover threshold or search months in Settings
- **CORS errors**: The server proxies API calls - ensure you're accessing via `localhost:3001`

### Map not rendering
- **Leaflet CDN blocked**: Check browser console for CDN loading errors
- **API rate limits**: Sentinel Hub free tier has limits - wait 1 minute and retry
- **Browser console**: Open DevTools (F12) → Console to see errors

### AI advice not working
- **Missing API key**: Add Gemini API key in Settings (admin login)
- **Get a free key**: https://aistudio.google.com/app/apikey

### GPS not working
- **Enable location**: Allow location access in browser settings
- **Use HTTPS**: GPS requires secure context. Use `localhost` or HTTPS.

### Docker issues
- **Build fails**: Ensure Docker is running and you have permissions
- **Port conflict**: Use `-p 8090:8080` to map a different host port
- **Health check fails**: Check GEE auth - the health endpoint tolerates GEE being disconnected

### Cloud Run specific
- **Deploy fails**: Run `gcloud auth login` first
- **Cold start delay**: First request after idle takes ~3-5 seconds
- **Memory errors**: Increase `--memory` to 1Gi for larger fields

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

# 🚀 Build & Deployment

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Included with Node.js |
| Python 3 | 3.10+ | https://python.org |
| pip | 23+ | Included with Python |
| Flutter | 3.12+ | https://flutter.dev |
| Docker | 24+ | https://docker.com |
| Git | 2+ | https://git-scm.com |

## Build the Project

### 1. Build the Next.js Frontend

```bash
cd crafty-gis-client
npm install
npm run build
```

The frontend build output goes to `crafty-gis-client/.next/`.

### 2. Build the Node.js Express Server

```bash
cd server
npm install
# Production build (optional, produces a minified bundle)
npx esbuild server/server.js --outfile=server.min.js --format=esm --platform=node --bundle
```

### 3. Build the Python FastAPI Backend

```bash
cd crafty-gis-server
pip install --quiet -r requirements.txt
pip freeze > requirements.lock
```

### 4. Copy Frontend Assets to www/

```bash
# Copy Next.js build output to www directory
rm -rf www
mkdir -p www
cp -r crafty-gis-client/.next www/
cp -r crafty-gis-client/public www/
cp package.json www/
cp tsconfig.json www/
cp eslint.config.mjs www/
cp postcss.config.mjs www/
cp vite.config.ts www/
cp css/ www/
cp js/ www/
```

### 5. Run the Full Build

```bash
bash build.sh
```

This builds everything in one step:
1. Frontend (Next.js)
2. Node.js server
3. Python backend
4. Docker image (if Docker is available)

### 6. Run Locally

```bash
# Start the full application
node server/server.js

# Or with Docker
docker compose -f docker-compose.yml up -d
```

## Build Targets

### Development Build (Full Development)

```bash
# Start the full development stack
bash build.sh
# Or manually:
cd server && npm start  # Node.js dev server
cd ../crafty-gis-client && npm run dev  # Next.js dev server
cd ../crafty-gis-server && python main.py  # Python backend
```

### Production Build (Docker)

```bash
# Build the Docker image
docker build -t crafty_gis:latest .

# Run locally
docker run -p 8080:8080 crafty_gis:latest

# Or deploy to a cloud platform
docker run -p 3001:8080 crafty_gis:latest
```

### Android App (Capacitor)

```bash
# 1. Install Capacitor CLI
npm install @capacitor/cli @capacitor/core @capacitor/android

# 2. Build web assets
./build.sh

# 3. Sync with Capacitor
npx cap sync android

# 4. Open in Android Studio
npx cap open android
```

## Build Artifacts

The build produces the following artifacts:

| Artifact | Location | Description |
|----------|----------|-------------|
| `www/` | Project root | Built frontend (HTML, CSS, JS) |
| `crafty-gis-client/.next/` | Frontend directory | Next.js production build |
| `server/` | Server directory | Node.js Express app |
| `crafty-gis-server/` | Server directory | Python FastAPI backend |
| `requirements.lock` | Server directory | Python dependency freeze |
| `docker-compose.yml` | Project root | Docker Compose config |
| `Dockerfile` | Project root | Production Dockerfile |
| `docker-compose.coolify.yml` | Project root | Coolify/Dokploy config |

## Build Troubleshooting

### Node.js not found
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Python not found
```bash
# Install Python 3
sudo apt-get install -y python3 python3-pip
```

### Flutter not found
```bash
# Install Flutter
git clone https://github.com/flutter/flutter.git -b v3.22.x $HOME/flutter
export PATH="$HOME/flutter/bin:$PATH"
flutter --version
```

### Docker not found
```bash
# Install Docker
# See https://docs.docker.com/get-docker/ for installation instructions
```

### "Port already in use" error
```bash
# Kill existing processes on the port
lsof -i :3001
kill -9 <PID>
# Or change the port
PORT=8080 node server/server.js
```

### Backend fails to start
```bash
# Check if the .env file has all required variables
cat .env

# Check if the server is listening
netstat -tlnp | grep 3001

# Check logs
tail -f /tmp/fh-server.log
```

### "GEE not initialized"
```bash
# Check if GEE service account credentials are set
echo $GEE_SERVICE_ACCOUNT
echo $GEE_PRIVATE_KEY

# Try to initialize GEE
curl -X POST http://localhost:3001/api/gee/init
```

## Docker Compose (Full Stack)

```bash
# Build and run the full stack
docker compose -f docker-compose.yml up -d

# Or for the self-hosted version
docker compose -f docker-compose.selfhost.yml up -d

# Or for Coolify/Dokploy
docker compose -f docker-compose.coolify.yml up -d
```

## Architecture

The project uses a **Primary → Fallback** architecture:

| Component | Primary | Fallback |
|-----------|---------|----------|
| Authentication | authentik (self-hosted) | Firebase Auth |
| AI Advisory | Ollama + DeepSeek | Gemini API |
| Satellite Data | Google Earth Engine | Sentinel Hub |
| Hosting | Coolify/Dokploy | Render |
| Monitoring | Uptime Kuma | Manual checks |
| Satellite Data (alt.) | STAC API / Open Data Cube | Sentinel Hub |

## Quick Start (Docker)

```bash
# One-command deployment
docker compose -f docker-compose.yml up -d

# Or use Coolify
docker compose -f docker-compose.coolify.yml up -d
```

## Quick Start (Local)

```bash
# 1. Start the backend
node server/server.js

# 2. Open in your browser
# http://localhost:3001
```

## Build Scripts

| Script | Purpose |
|--------|---------|
| `build.sh` | Full build (frontend + server + Python + Docker) |
| `build-frontend.py` | Build Next.js frontend only |
| `build-web.ps1` | Build web assets (Windows) |
| `deploy.ps1` | Deploy to Google Cloud Run |

## Build Artifacts

The build produces the following outputs:

- **`www/`** — Static frontend (HTML, CSS, JS) — **production build**
- **`crafty-gis-client/.next/`** — Next.js production build — **frontend output**
- **`server/`** — Node.js Express server — **backend output**
- **`crafty-gis-server/`** — Python FastAPI backend — **backend output**
- **`requirements.lock`** — Python dependency freeze — **for reproducible builds**
- **`docker-compose.yml`** — Docker Compose configuration — **deployment**
- **`Dockerfile`** — Production Docker image — **container build**
- **`docker-compose.coolify.yml`** — Coolify/Dokploy config — **deployment**

---

<div align="center">

**Made with ❤️ for Global Agriculture** 🌾🛰️

**Crafty GIS v2.0** — *Satellite Vision for Every Field*

[⬆ Back to Top](#-crafty_gis--satellite-crop-monitor)

</div>
