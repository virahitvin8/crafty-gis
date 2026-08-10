# 🛰️ Crafty GIS — Deployment Guide

Crafty GIS is a two-piece system:
- **Frontend** — static HTML/JS/CSS files → deployed to **Netlify** (free)
- **Backend** — Node.js Express server → deployed to **Render** (free)

---

## Prerequisites

You need accounts at:
- [GitHub](https://github.com) — to host the code
- [Netlify](https://netlify.com) — to serve the frontend
- [Render](https://render.com) — to run the backend
- [Sentinel Hub](https://apps.sentinel-hub.com) — for real satellite data
- [Google AI Studio](https://aistudio.google.com/app/apikey) — for Gemini AI advice
- [Firebase Console](https://console.firebase.google.com) — for user login (already configured)

---

## Step 1 — Push code to GitHub

```bash
cd "AGRI APP"
git init
git add .
git commit -m "Initial Crafty GIS web app"
git remote add origin https://github.com/YOUR_USERNAME/crafty_gis.git
git push -u origin main
```

---

## Step 2 — Get your API keys

### Sentinel Hub
1. Go to https://apps.sentinel-hub.com/dashboard
2. Sign up → User Settings → OAuth clients → Create new
3. Copy the **Client ID** and **Client Secret**

### Gemini AI
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy the key (starts with `AIza…`)

---

## Step 3 — Deploy Backend to Render

1. Go to https://render.com → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render auto-reads `render.yaml` — it sets up `crafty_gis-backend`
4. In the service settings → **Environment** tab, add these secrets:

| Key | Value |
|-----|-------|
| `GEE_SERVICE_ACCOUNT` | your GEE service-account email |
| `GEE_PRIVATE_KEY` | the **single-line** PEM with `\n` escapes (paste as-is from `.env`) |
| `GEMINI_API_KEY` | your Gemini API key (optional fallback) |
| `SENTINEL_HUB_CLIENT_ID` | your Sentinel Hub Client ID (optional fallback) |
| `SENTINEL_HUB_CLIENT_SECRET` | your Sentinel Hub Client Secret (optional fallback) |
| `OLLAMA_BASE_URL` | leave unset unless you run a self-hosted Ollama |

5. Click **Deploy** — wait ~2 minutes (free-tier cold start can take a few more)
6. Your backend URL will be `https://farmhealth1-backend.onrender.com`
   (or a custom name if you changed it — copy the URL shown in the dashboard)

---

## Step 4 — Update backend URL in frontend

If your Render service was named differently, update this line in `js/config.js`:

```js
GEE_PROXY: (window.location.hostname === 'localhost' || ...)
  ? window.location.origin + '/api/gee'
  : 'https://YOUR-RENDER-URL.onrender.com/api/gee'
```

And update `netlify.toml`:
```toml
[[redirects]]
  from = "/api/*"
  to = "https://YOUR-RENDER-URL.onrender.com/api/:splat"
```

---

## Step 5 — Deploy Frontend to Netlify

### Option A — Netlify Drop (fastest, no git needed)
1. Go to https://app.netlify.com/drop
2. Drag the entire project folder onto the page
3. Done — live in 30 seconds

### Option B — Connect GitHub (recommended for auto-deploy)
1. Netlify → **Add new site** → **Import from Git**
2. Connect your GitHub repo
3. Build settings:
   - **Build command:** `bash build.sh` (keeps `www/` fresh; Netlify serves the root)
   - **Publish directory:** `.`  (the root — `netlify.toml` already handles the rest)
4. Click **Deploy site**

Netlify auto-reads `netlify.toml`. All `/api/*` requests are proxied to your Render backend.

---

## Step 6 — Firebase setup (for Google login)

Firebase is already configured in `js/firebase.js` with the existing project.

To use your own Firebase project:
1. Go to https://console.firebase.google.com
2. Create a project → Enable **Authentication** → **Sign-in method** → Google
3. Add your Netlify domain to **Authorized domains**
4. Copy the config object and replace the values in `js/firebase.js`

To add your Netlify domain to the existing project:
1. Firebase Console → operationorigami-a33e0 → Authentication → Settings → Authorized domains
2. Add your Netlify URL (e.g., `crafty_gis.netlify.app`)

---

## Running locally

```bash
# Install backend dependencies
npm install
cd server && npm install && cd ..

# Copy and fill in your credentials
cp .env.example .env
# Edit .env with your keys

# Start the backend server
npm start
# Server runs on http://localhost:3001 (frontend served from the same origin)

# Open the frontend
# Just open index.html in your browser, or:
open http://localhost:3001
```

---

## Architecture

```
Browser
  │
  ├── GET /          → Netlify serves index.html + JS/CSS
  │
  └── POST /api/*    → Netlify proxies to Render backend
        │
        ├── /api/sentinel/token     → Fetches Sentinel Hub OAuth token
        ├── /api/gemini-analysis    → Proxies Gemini AI request
        ├── /api/vision-analysis    → Crop-photo AI (disease detection)
        ├── /api/gee/ndvi           → Google Earth Engine NDVI
        ├── /api/gee/sar            → Sentinel-1 SAR soil moisture
        ├── /api/gee/time-series    → NDVI time series
        ├── /api/infrastructure    → Nearby power/water/wells (OSM)
        └── /api/gee/health        → Health check + keep-alive target
```

---

## Keep-alive (prevent Render free tier from sleeping)

Render free services sleep after 15 minutes of inactivity. To keep it awake:

**Option 1 — UptimeRobot (free)**
1. Go to https://uptimerobot.com → Create free account
2. Add HTTP monitor → URL: `https://farmhealth1-backend.onrender.com/api/gee/health`
3. Check every 5 minutes

**Option 2 — cron-job.org (free)**
1. Go to https://cron-job.org
2. Create a job pinging `https://farmhealth1-backend.onrender.com/api/gee/health` every 5 minutes

---

## Environment variables reference

| Variable | Where to set | Description |
|----------|-------------|-------------|
| `GEE_SERVICE_ACCOUNT` | Render dashboard | GEE service-account email |
| `GEE_PRIVATE_KEY` | Render dashboard | Single-line PEM with `\n` escapes |
| `GEMINI_API_KEY` | Render dashboard | AI crop advice (fallback after Ollama) |
| `SENTINEL_HUB_CLIENT_ID` | Render dashboard | Satellite data OAuth (fallback) |
| `SENTINEL_HUB_CLIENT_SECRET` | Render dashboard | Satellite data OAuth (fallback) |
| `OLLAMA_BASE_URL` | Render dashboard | Self-hosted Ollama endpoint (optional) |
| `OLLAMA_MODEL` | Render dashboard | e.g. `deepseek-r1:7b` (optional) |
| `PORT` | Render auto-sets | Server port |
| `NODE_ENV` | Render auto-sets | `production` |
