# FarmHealth — What To Do Next (Playbook)

> Last updated: 2026-08-09 · This is the **action checklist**, not the deep roadmap
> (see `SELFHOST_MIGRATION.md` for the full phased plan and `SELFHOST_SETUP.md` for install details).

---

## ✅ What is already done (this session)

| Item | Status |
|---|---|
| **GEE service account** configured in your local `.env` (gitignored) | ✅ `[GEE] Initialized successfully!` — `/api/gee/health` → `{"status":"connected","initialized":true}` |
| **AI advice chain** — Ollama (`deepseek-r1:7b`) → Gemini → built-in expert fallback | ✅ `/api/gemini-analysis`, `/api/ai/health` live |
| **LLaVA photo diagnosis** — your exact JSON schema (`disease, confidence, severity, affected_area, recommendation, parameters{}`) | ✅ `/api/vision-analysis` + frontend upload UI |
| **Land Info card** — honest manual-entry + official state-portal deep-links (all 37 states) + new bilingual step-by-step guide & auto-detected state | ✅ built into `www/` |
| **Click-to-scan “What's at this location”** — auto pincode (India Post API) + nearby power/water/canal infrastructure (OpenStreetMap) with distances, when a field is selected | ✅ auto-runs on field select |
| **Import my own records (CSV)** — upload `lat,lng,survey,khata,owner,motor,pipeline,electricity,...` → clicking a field auto-matches the nearest record within 500 m | ✅ built into Land Info card |
| **Correct Ollama model tags** everywhere (`deepseek-r1:7b`, `llava-phi3`) | ✅ fixed in compose files, `.env.example`, all docs |
| **Self-host stack** — `docker-compose.selfhost.yml` (farmhealth + ollama + postgis + uptime-kuma) | ✅ validated |

---

## 🚀 Immediate actions (today, ~30 minutes)

### 1. Commit & push everything (this triggers BOTH deploys)
```bash
cd "/home/akshit/Desktop/claude_build/AGRI APP"
bash build.sh                    # ensure www/ is current (already done)
git add -A
git commit -m "feat: click-to-scan land info + pincode + OSM infra + CSV records + GEE"
git push origin main
```
Render auto-deploys the backend; Netlify auto-deploys the frontend.

### 2. Add the GEE env vars to Render (ONLY in the dashboard — never in the repo)
1. Render dashboard → your **farmhealth1-backend** service → **Environment** tab.
2. Add these (mark as **Secret**):
   - `GEE_SERVICE_ACCOUNT` = `gee-backend-account@braided-analyst-500314-c5.iam.gserviceaccount.com`
   - `GEE_PRIVATE_KEY` = the **single-line** value from your local `.env` (everything between the quotes — it already has `\n` escapes, paste as-is)
   - `GEMINI_API_KEY` = your key (you already have it locally)
3. Save, then **Manual Deploy → Deploy latest commit**.
4. Wait ~2-4 min (free tier cold start).

### 3. Verify the backend is live (open these URLs)
- `https://farmhealth1-backend.onrender.com/api/health` → `"gee":"connected"`
- `https://farmhealth1-backend.onrender.com/api/gee/health` → `{"status":"connected","initialized":true}`
- **NEW** — the infrastructure endpoint (returns real OpenStreetMap data):
  ```bash
  curl -X POST https://farmhealth1-backend.onrender.com/api/infrastructure \
    -H "Content-Type: application/json" \
    -d '{"lat":25.4358,"lng":81.8463,"radius":2000}'
  ```
  → expect `{"success":true,"count":12,..."source":"openstreetmap"}` (real power towers near Prayagraj).

### 4. Verify the frontend on Netlify
- Your Netlify site (`fastidious-yeot-0c0d83.netlify.app` / `astonishing-begonia-79345d.netlify.app`) serves the
  repo root (`publish = "."` in `netlify.toml`) and **proxies `/api/*` → Render automatically**, so the new
  `/api/infrastructure` endpoint needs **no extra Netlify config**.
- **Important note:** because the app calls `/api/infrastructure` same-origin on Netlify, and Netlify rewrites it
  to Render, the click-to-scan works. If the backend is ever down, the frontend **falls back to calling
  Overpass directly from the browser** — so the scan still works even when Render is offline.

### 5. Sanity-check the live app
- Draw/select a field → the Land Info card auto-fills: **📮 PIN code** (India Post), **🗺️ Nearby infrastructure**
  (power lines/poles, water pipelines, wells, canals with distances from OpenStreetMap), and any **imported
  record match** — plus the **📋 How to get Survey / Khata / Owner details** guide with your state's portal.
- Upload your own records CSV via **📁 My Land Records (auto-match)** — clicking a field near a record instantly
  shows its survey/khata/owner/motor/pipeline/electricity details (within 500 m).
- Click **🔗 Open Uttar Pradesh portal** → official portal (e.g. upbhulekh.gov.in) for the OTP-gated owner names.
- Run Full Analysis → map data should show **🛰️ LIVE** (GEE or Sentinel Hub) instead of DEMO.

### 4. CSV format for your own records (one row per land plot)
```csv
lat,lng,survey,khata,owner,motor,pipeline,electricity,village,district,state,pincode
25.4358,81.8463,124,345/12,Ram Singh,MTR-2024-0451,TWL-03,EB-789456123,Kandhai,Pratapgarh,Uttar Pradesh,230001
```
Only `lat` and `lng` are required — the rest are optional and shown when a field is clicked within 500 m.

---

## 🏠 Self-host on your 8 GB laptop (phase 1 — this week)

Your laptop must run 24×7 **even with the lid closed** — two paths:

**Linux (recommended for 24×7):** add this to `sudo crontab -e`:
```
@reboot /usr/sbin/rtcwake -m no -s 0   # optional: keep RTC alive
```
and set **Settings → Power → "When lid is closed: Do nothing"** (GNOME: `gsettings set org.gnome.settings-daemon.plugins.power lid-close-ac-action 'nothing'`).

**Windows:** Settings → System → Power → **Lid close action: Do nothing** (when plugged in), then enable Wake-on-LAN in BIOS if you want remote wake.

Then bring up the stack:
```bash
docker compose -f docker-compose.selfhost.yml up -d
docker compose -f docker-compose.selfhost.yml logs -f ollama   # watch it pull deepseek-r1:7b (~4.7 GB)
```
The stack auto-pulls `deepseek-r1:7b` and serves Ollama on `:11434`, FarmHealth on `:8080`, Uptime Kuma on `:3001`.

**Tip:** `POST /api/ai/health` is the Uptime Kuma probe; add it as an HTTP monitor once Kuma is up.

---

## 📋 The week-by-week plan (your "all of it, phased")

| When | What | Fallback stays |
|---|---|---|
| **Week 1** | Self-host AI: Ollama + `deepseek-r1:7b`, frontend already prefers backend → Ollama | Gemini key still works if Ollama is down |
| **Week 2** | Photo diagnosis: `ollama pull llava-phi3` (~2.9 GB) on the laptop | Cloud Gemini never involved |
| **Week 3** | Move deployment off Render → **Coolify** (or Dokploy) on the laptop; keep Render as cold standby | Render URL still resolves |
| **Week 4** | Auth: **Authelia** (lightweight, 8 GB friendly) → OIDC; `js/firebase.js` kept as fallback | Firebase + mock still work |
| **Week 5** | Uptime Kuma monitoring for all services | — |
| **Later** | Sentinel Hub → free **Copernicus Data Space / STAC**, then full **Open Data Cube**; `GEE` proxy already handles SAR/soil | Sentinel Hub proxy remains |

---

## 🔐 Security notes

- Your GEE private key is **now in your git-ignored `.env`** — never commit it. If the repo was ever pushed with it,
  **rotate the key immediately** (GCP Console → Service Accounts → the key → Delete, then create a new one).
- On Render, never paste the key into your repo — only into the dashboard env vars (they're encrypted at rest).
- Key rotation on GCP: https://console.cloud.google.com/iam-admin/serviceaccounts → `gee-backend-account` → Keys.

---

## 🔍 Troubleshooting quick-reference

| Symptom | Fix |
|---|---|
| `/api/gee/health` → not connected | Re-check `GEE_PRIVATE_KEY` is single-line with `\n` escapes; redeploy; wait for Render cold start (up to ~30 s) |
| `/api/infrastructure` → 406 or error | Render's Outbound requests must reach overpass-api.de (usually fine). The frontend auto-falls back to direct Overpass from the browser, so the feature still works. |
| Map shows DEMO | Live satellite APIs unreachable → app auto-falls back. Check server logs for the exact error. |
| Photo upload fails | Ollama not running or `llava-phi3` not pulled. On laptop: `ollama pull llava-phi3`. |
| "Ollama unavailable" in `/api/health` | Expected until you self-host. AI still works via Gemini/fallback. |
| Laptop sleeps on lid close | Fix per the lid-close instructions above. |

---

## 📌 Golden rule (as you asked)

> **Keep everything as a replacement.** Every new self-hosted piece falls back to the existing cloud/demo path —
> if Ollama is down → Gemini → expert fallback; if self-hosted auth is down → Firebase/mock; if Coolify is down →
> Render still serves. Nothing breaks when a new component is missing.
