<div align="center">

# 🛰️ FarmHealth — Satellite Crop Monitor

### *Advanced Satellite Vision for Precision Agriculture*

**Real-time, pixel-level crop health monitoring and analytics — from space to your pocket 🛰️🌾**

<br>

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://javascript.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Sentinel Hub](https://img.shields.io/badge/Sentinel_Hub-004488?style=for-the-badge&logo=esa&logoColor=white)](https://sentinel-hub.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://capacitorjs.com)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🛰️ How It Works](#️-how-it-works)
- [🚀 Quick Start](#-quick-start)
- [🔧 Deployment Guide](#-deployment-guide)
  - [Option 1: Local Development Server](#option-1-local-development-server)
  - [Option 2: Docker (Any Cloud)](#option-2-docker-any-cloud)
  - [Option 3: Google Cloud Run (Recommended)](#option-3-google-cloud-run-recommended)
  - [Option 4: Static Hosting (Netlify / Vercel / GitHub Pages)](#option-4-static-hosting-netlify--vercel--github-pages)
  - [Option 5: Android App (Capacitor)](#option-5-android-app-capacitor)
- [🔐 Authentication & API Keys](#-authentication--api-keys)
- [📡 Satellite Data Sources](#-satellite-data-sources)
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
| 🤖 | **AI Agronomist** | Gemini-powered personalized field advice | Google Gemini API |
| 🌤️ | **Live Weather** | 7-day forecast, soil temp/moisture, evapotranspiration | Open-Meteo |
| ⛰️ | **Terrain Analysis** | Elevation, slope, drainage class | Open-Meteo + SRTM |
| 🌱 | **Soil Properties** | pH, organic carbon, texture, nitrogen | SoilGrids |
| 📊 | **Time Series** | Track NDVI changes over time with change detection | Sentinel Hub Stats |
| 🚇 | **Guided Onboarding** | 8-step metro tour walks new users through first analysis | Interactive UI |
| 📚 | **Education Module** | 8 remote sensing lessons + 10-question knowledge quiz | Built-in |
| 📱 | **PWA + Android** | Installs as native app, works offline | Capacitor + Service Worker |

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
git clone https://github.com/virahitvin8/farmhealth.git
cd farmhealth

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
docker build -t farmhealth:latest .
```

#### Run locally
```bash
docker run -p 8080:8080 farmhealth:latest
# → http://localhost:8080
```

#### Push to container registry
```bash
# Docker Hub
docker tag farmhealth:latest yourusername/farmhealth:latest
docker push yourusername/farmhealth:latest

# Google Container Registry
docker tag farmhealth:latest gcr.io/your-project/farmhealth:latest
docker push gcr.io/your-project/farmhealth:latest

# AWS ECR
docker tag farmhealth:latest your-account.dkr.ecr.region.amazonaws.com/farmhealth:latest
docker push your-account.dkr.ecr.region.amazonaws.com/farmhealth:latest
```

#### Deploy to any container platform
```bash
# AWS ECS (via CLI)
aws ecs run-task --cluster your-cluster --task-definition farmhealth

# Azure Container Instances
az container create --resource-group your-rg --name farmhealth \
  --image your-registry/farmhealth:latest --ports 8080

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
docker build -t gcr.io/your-project-id/farmhealth:latest .
docker push gcr.io/your-project-id/farmhealth:latest

# 3. Deploy to Cloud Run
gcloud run deploy farmhealth \
  --image gcr.io/your-project-id/farmhealth:latest \
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
gcloud run services describe farmhealth --region us-central1 \
  --format 'value(status.url)'

# View logs
gcloud logging read "resource.type=cloud_run_revision AND \
  resource.labels.service_name=farmhealth" --limit 20

# Check health
curl https://farmhealth-xxxxx-uc.a.run.app/api/gee/health
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

# Windows PowerShell
.\build-web.ps1
```

Files are output to the `www/` directory.

#### Deploy to Netlify
```bash
# Using Netlify CLI
netlify deploy --prod --dir www

# Or drag-and-drop the www/ folder onto https://app.netlify.com/drop
```

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
  "appId": "com.farmhealth.app",
  "appName": "FarmHealth",
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

### Built-in Roles
| Role | Username | Password | Settings Access |
|------|----------|----------|-----------------|
| **Admin** | `admin` | `admin` | Can view & edit API keys |
| **User** | `user` | `user` | No API key access |

### API Keys (Set in Settings → Admin login)

| Key | Source | Purpose | Required? |
|-----|--------|---------|-----------|
| **Gemini API Key** | [Google AI Studio](https://aistudio.google.com/app/apikey) | AI-powered field advice | ❌ (optional) |
| **Sentinel Hub Client ID** | [Sentinel Hub Dashboard](https://www.sentinel-hub.com/) | Satellite data fetch | ✅ (default provided) |
| **Sentinel Hub Client Secret** | [Sentinel Hub Dashboard](https://www.sentinel-hub.com/) | Satellite data auth | ✅ (default provided) |

### Environment Variables (Server)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
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
farmhealth/
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

<div align="center">

**Made with ❤️ for Global Agriculture** 🌾🛰️

**FarmHealth v2.0** — *Satellite Vision for Every Field*

[⬆ Back to Top](#-farmhealth--satellite-crop-monitor)

</div>
