# 🚀 Crafty GIS — Deployment Checklist & Credentials

> **Repo:** `github.com/virahitvin8/crafty-gis` (branch `main`)
> **App:** Full-stack satellite crop monitor (Node backend + vanilla-JS frontend)
> **Latest push:** ✅ verified — `5d1cfb5` (server boots, GEE connected, health checks pass)

---

## 📋 Master Checklist

- [ ] **1. GitHub repo is pushed** ✅ *DONE — main = 5d1cfb5*
- [ ] **2. Server boots locally** ✅ *DONE — /api/health returns ok, GEE initialized*
- [ ] **3. Backend deployed to Render** (free) — below
- [ ] **4. Frontend deployed to Netlify / Vercel** — below
- [ ] **5. Custom domain + HTTPS** (optional)
- [ ] **6. Uptime monitoring** (optional, free: Uptime Kuma)
- [ ] **7. Public release** — share the URL

---

## 🔑 Credentials You Need (set these as env vars in the hosting dashboard)

| Variable | Where to get it | Required? |
|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey (free) | ✅ yes (AI advice fallback) |
| `SENTINEL_HUB_CLIENT_ID` | https://www.sentinel-hub.com → Dashboard → OAuth clients | ✅ yes (satellite data) |
| `SENTINEL_HUB_CLIENT_SECRET` | same place as above | ✅ yes |
| `GEE_SERVICE_ACCOUNT` | Google Cloud Console → IAM → Service Accounts | ⚠️ optional (primary source) |
| `GEE_PRIVATE_KEY` | download the service-account JSON → copy the `private_key` field **as a single line** (the `\n` escapes are already baked in) | ⚠️ optional |
| `BACKEND_URL` | your Render URL once deployed, e.g. `https://crafty-gis-backend.onrender.com` | ✅ yes (frontend → backend) |
| `PORT` | `10000` (Render default) | ✅ yes |
| `NODE_ENV` | `production` | ✅ yes |

> 🔐 Your local `.env` already contains all of these values — copy them from there. **Never commit `.env` to the repo** (it's gitignored).

---

## 🟢 Option A — Render (Recommended: full backend, free)

**render.yaml is already configured** — one-click blueprint deploy:

1. Go to https://render.com → Sign up (GitHub login)
2. Click **New → Blueprint**
3. Connect the repo `virahitvin8/crafty-gis`
4. Render reads `render.yaml` automatically → creates `farmhealth1-backend`
5. Before deploying, click the service → **Environment** tab → add these **Secret** vars:

```
GEMINI_API_KEY        = <from your .env>
SENTINEL_HUB_CLIENT_ID    = <from your .env>
SENTINEL_HUB_CLIENT_SECRET = <from your .env>
GEE_SERVICE_ACCOUNT   = <from your .env>
GEE_PRIVATE_KEY       = <from your .env — single line with \n escapes>
```

6. Click **Deploy** → wait ~3–5 min
7. Verify: open `https://<your-service>.onrender.com/api/gee/health` → should return `{"status":"connected","initialized":true}`
8. Copy your backend URL → it becomes `BACKEND_URL`

> ⚠️ Free tier sleeps after 15 min idle (wakes on first request, ~30s cold start). Upgrade to $7/mo Starter for always-on.

---

## 🟢 Option B — Netlify (frontend hosting, free)

**netlify.toml is already configured** (it proxies `/api/*` to your Render backend):

1. Go to https://app.netlify.com → **Add new site → Import an existing project**
2. Connect GitHub → pick `crafty-gis`
3. Build settings are auto-detected:
   - **Publish directory:** `.`
   - **Build command:** *(none needed — it's static)*
4. **Environment variables** (Site settings → Environment):

```
BACKEND_URL = https://crafty-gis-backend.onrender.com
```

5. Click **Deploy site** → ~1 min
6. Your URL: `https://<random-name>.netlify.app`

---

## 🟢 Option C — Vercel (frontend hosting, free, serverless AI)

**vercel.json is already configured** — includes serverless functions for satellite auth + AI advice, so Vercel can even run without Render:

1. Go to https://vercel.com → **Add New → Project**
2. Import `crafty-gis` from GitHub
3. Framework preset: **Other** (static files)
4. Environment variables:

```
GEMINI_API_KEY = <from your .env>
SENTINEL_HUB_CLIENT_ID = <from your .env>
SENTINEL_HUB_CLIENT_SECRET = <from your .env>
```

5. Click **Deploy**
6. Your URL: `https://crafty-gis.vercel.app`

---

## 🟡 Alternative Hosts

| Platform | Type | Cost | Notes |
|---|---|---|---|
| **Railway** | Full backend | Free tier ($5 trial) | `railway up`, one command |
| **Fly.io** | Full backend | ~$3/mo | `fly launch`, Docker support |
| **Docker + any VPS** | Full stack | ~$5/mo | `docker-compose.yml` included |
| **Coolify / Dokploy** | Self-host | your VPS | `docker-compose.coolify.yml` included |
| **Google Cloud Run** | Full backend | Free tier | `cloudbuild.yaml` included |
| **Cloudflare Pages** | Frontend | Free | static only, needs Render backend |

---

## ✅ Post-Deploy Verification

- [ ] `GET <backend>/api/health` → `{"status":"ok","gee":"connected"}`
- [ ] `GET <backend>/api/gee/health` → `{"status":"connected","initialized":true}`
- [ ] Open the frontend URL → login works
- [ ] Draw a field on the map → satellite analysis returns NDVI/health score
- [ ] AI advice card loads (Gemini key working)

## 📣 Release

1. Optional: connect a custom domain in Netlify/Vercel (Settings → Domains)
2. Share the URL, or submit to Product Hunt / Twitter / farming communities
3. Optional: add **Uptime Kuma** (free) to watch the health endpoint 24/7

---

*Generated for Crafty GIS v1.0.0 — repo `virahitvin8/crafty-gis`, commit `5d1cfb5`*
