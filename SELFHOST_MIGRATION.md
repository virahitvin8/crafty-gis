# 🏠 FarmHealth — Full Self-Hosting Migration Roadmap

> **Goal:** Run the entire FarmHealth stack (satellite, AI, auth, monitoring) on your own hardware — **an 8 GB laptop running 24×7, even with the lid closed** — with zero per-user cloud bills.
>
> **Status:** 🚧 In progress. Phase 1–2 implemented in this repo. Phases 3+ are step-by-step plans you can execute at your own pace.

---

## 🧭 The destination architecture

```
                    ┌─────────────────────────────────────────────┐
                    │          THE 8GB LAPTOP (your server)        │
                    │  "Always on" — lid closed, 24×7             │
                    └──────────────────┬──────────────────────────┘
                                       │
        ┌──────────────┬──────────────┼──────────────┬─────────────┐
        │              │              │              │             │
   ┌────┴────┐   ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐  ┌────┴─────┐
   │ FarmHealth│   │  Ollama   │  │ PostgreSQL│  │ Uptime    │  │ Authelia │
   │ Backend   │   │ (LLM)     │  │ + PostGIS │  │ Kuma      │  │ (Auth)   │
   │ Node/Expr │   │ DeepSeek  │  │ (land rec,│  │ (monitor) │  │ Phase 4  │
   │ + frontend│   │ R1 7B     │  │  ODC later)│  │           │  │          │
   └────┬────┘   └─────┬─────┘  └────────────┘  └────────────┘  └──────────┘
        │              │
        │      ┌───────┴────────┐
        └─────▶│  Coolify /     │  ← self-hosted PaaS: reverse proxy,
               │  Dokploy       │    one-click deploys, Let's Encrypt SSL
               └───────┬────────┘
                       │
              ┌────────┴────────┐
              │  STAC API +     │  ← Phase 5: local catalog, Copernicus
              │  Open Data Cube │    Data Space / AWS Earth Search feeds
              └─────────────────┘
```

| Cloud service today | Self-hosted replacement | Phase | Status |
|---|---|---|---|
| Render / Vercel / Netlify hosting | Coolify or Dokploy on the laptop | 3 | 🔜 |
| Gemini AI advice | **Ollama + `deepseek-r1:7b`** (keeps `getFallbackAdvice()` as offline backup) | 2 | ✅ **Implemented** |
| Firebase Auth | **Authelia** (light) or Authentik (heavy) | 4 | 🔜 |
| Sentinel Hub | **STAC API + Open Data Cube** (staged — GEE already gives you an escape hatch) | 5 | 🔜 |
| Cloud monitoring | **Uptime Kuma** (self-hosted health checks + alerts) | 3 | 🔜 |
| — (new feature) | **LLaVA vision model** for photo-based crop disease detection | 6 | 🔜 |

---

## ⚡ Phase 0 — Honest sizing for your 8 GB laptop

8 GB RAM is *workable but tight*. Here is the real memory budget:

| Component | RAM |
|---|---|
| Operating system (Linux server, headless) | ~0.8–1.2 GB |
| FarmHealth backend (Node + Express) | ~0.3 GB |
| PostgreSQL + PostGIS | ~0.4 GB (tune `shared_buffers = 128MB`) |
| Ollama + `deepseek-r1:7b` (Q4_K_M ≈ 4.7 GB) | ~5.0 GB resident |
| Uptime Kuma | ~0.2 GB |
| Authelia (Phase 4) | ~0.1 GB |
| **Total** | **~7.5 GB** |

**Rules to make it fit:**

1. **Add swap — non-negotiable.** 8 GB file-based swap (or 4 GB zram) absorbs spikes so the box never OOM-kills your LLM mid-request.
2. **DeepSeek-R1-Distill-Qwen-7B is the right model** (`deepseek-r1:7b` in Ollama, ≈4.7 GB Q4). If RAM pressure appears, drop to `qwen2.5:3b` (~2 GB) or `deepseek-r1:1.5b` (~1.1 GB) — the advice pipeline works identically.
3. **Run Ollama with `OLLAMA_NUM_PARALLEL=1`** (one request at a time — CPU inference can't multitask usefully anyway).
4. **Skip Proxmox.** On 8 GB, a hypervisor + guest overhead wastes ~1–2 GB and adds nothing. Run **Debian/Ubuntu server + Docker** directly (this is exactly what Coolify expects). Revisit Proxmox only if you later buy a beefier machine and want VMs.
5. **Expect slow LLM tokens on CPU:** 7B Q4 ≈ **4–8 tokens/sec** (≈1–2 min per advice). That's fine for an agronomist report. Keep the response streaming/spinner UX.

---

## 🔌 Phase 1 — "Always-on" laptop config (do this first, once)

Your laptop must keep running with the lid closed. **Pick your path:**

### Path A — Keep Windows (easiest, no reinstall)
1. **Power & sleep settings** → set *"When I close the lid: Do nothing"* (plugged in AND on battery).
2. Disable *sleep / hibernate* on AC power.
3. Install **Docker Desktop (WSL2)** or **Podman Desktop**.
4. Optional: enable **Wake-on-LAN** in BIOS so you can wake it remotely.
5. Set the laptop's power plan to *High performance*, and in Settings → System → Power → *"Screen and sleep"* → Never.

> ⚠️ Windows + WSL2 gotcha: WSL2 virtual machines can suspend when idle. Disable WSL idle timeout with a `.wslconfig` in `%UserProfile%`:
> ```ini
> [wsl2]
> memory=6GB
> swap=8GB
> ```
> and in PowerShell: `wsl --shutdown`, then `wsl` again.

### Path B — Repurpose as a Linux server (recommended, best RAM efficiency)
```bash
# 1. Install Debian 12 (Server, no GUI) or Ubuntu Server 24.04
# 2. Keep it running with lid closed:
sudo mkdir -p /etc/systemd/logind.conf.d
sudo tee /etc/systemd/logind.conf.d/10-lid.conf > /dev/null <<'EOF'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
EOF
sudo systemctl restart systemd-logind

# 3. Disable suspend/hibernate entirely
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

# 4. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # re-login after this
```
> Test it: close the lid, wait 60 s, SSH back in from your phone — the box must respond.

### Both paths
- Set a **static IP / DHCP reservation** in your router.
- Install **Tailscale** (`curl -fsSL https://tailscale.com/install.sh | sh && tailscale up`) — free, encrypted access to your laptop from anywhere without opening ports. This is your remote admin tunnel *and* the way Coolify handles webhooks.
- Get a free **Dynamic DNS** name (e.g. DuckDNS) if you ever expose Coolify publicly.

---

## 🤖 Phase 2 — Ollama AI advice (✅ implemented in this repo)

### What changed
`server/server.js` now runs the advice pipeline as:

```
1. Ollama (self-hosted LLM)   ← PRIMARY  (OLLAMA_BASE_URL, default http://localhost:11434)
2. Gemini (cloud, optional)   ← if OLLAMA_MODEL unreachable AND GEMINI_API_KEY set
3. getFallbackAdvice()        ← ALWAYS the last-resort offline expert model (unchanged)
```

The frontend (`js/api.js` → `getAIAdvice`) was also updated to **prefer the backend proxy** — so even if a Gemini key is still saved in Settings, requests go through the server (Ollama → Gemini → fallback) instead of calling Google directly from the browser. Direct-browser Gemini remains only as a last resort for pure-static hosting with no backend at all.

### Try it now (laptop only, no Docker needed)
```bash
# 1. Install Ollama on the laptop
curl -fsSL https://ollama.com/install.sh | sh
# 2. Pull the model (≈4.7 GB download)
ollama pull deepseek-r1:7b
# 3. Run the FarmHealth server
cd server && npm install && npm start
# 4. Point the server at Ollama (default already localhost:11434)
OLLAMA_MODEL=deepseek-r1:7b
# 5. Test
curl -X POST http://localhost:3001/api/gemini-analysis \
  -H "Content-Type: application/json" \
  -d '{"crop":"Wheat","ndvi":0.62,"soilPh":6.4,"soilNitrogen":118,"growthStage":"mid"}'

# Health check for Uptime Kuma later:
curl http://localhost:3001/api/ai/health
# → { "ollama": "connected", "model": "deepseek-r1:7b", ... }
```

### Environment variables (server)
| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server address (`http://ollama:11434` inside Docker) |
| `OLLAMA_MODEL` | `deepseek-r1:7b` | Model tag; swap to `qwen2.5:3b` / `deepseek-r1:1.5b` on RAM pressure |
| `OLLAMA_TIMEOUT_MS` | `180000` | Max wait for an Ollama reply (cold model load on CPU can be slow) |
| `OLLAMA_DISABLED` | unset | Set `true` to skip Ollama entirely |
| `GEMINI_API_KEY` | unset | Optional cloud fallback between Ollama and the expert model |

---

## 🐳 Phase 3 — Self-host stack (✅ compose file included)

A production-oriented stack is provided in **`docker-compose.selfhost.yml`**:

| Service | Image | Why |
|---|---|---|
| `farmhealth` | built from repo `Dockerfile` | The app + backend |
| `ollama` | `ollama/ollama:latest` | Local LLM, auto-pulls `deepseek-r1:7b` on start |
| `postgis` | `postgis/postgis:16-3.4` | Land records, saved farms; the Open Data Cube DB later |
| `uptime-kuma` | `louislam/uptime-kuma:latest` | Health checks + alerts for all services |

```bash
# Deploy the whole self-hosted stack:
docker compose -f docker-compose.selfhost.yml up -d --build

# Monitor:
docker compose -f docker-compose.selfhost.yml ps
```

### Uptime Kuma — wire these monitors
1. Ports (as set in `docker-compose.selfhost.yml`): **FarmHealth → `http://<laptop-ip>:8080`**, **Uptime Kuma dashboard → `http://<laptop-ip>:3001`**.
2. In the Kuma dashboard, add monitors:
   - HTTP(S) → `http://<laptop-ip>:8080/api/ai/health` (backend + Ollama in one probe)
   - HTTP(S) → `http://<laptop-ip>:8080/api/gee/health`
   - Docker container status for `ollama`, `postgis`, `uptime-kuma`
   - **Ping monitor** → `http://<laptop-ip>` (box alive, lid closed, 24×7)
3. Notifications: Telegram/email/ntfy — so a dead backend texts you.

### Coolify vs Dokploy (your call, later)
- **Coolify** — most mature, great UI, built-in Traefik/Caddy + Let's Encrypt, per-service env vars, one-click Docker deploys. Pick this.
- **Dokploy** — lighter, Traefik-based, simpler, also excellent. Pick if Coolify feels heavy.
- Both can deploy this repo from GitHub or from the local compose file. They give you the **reverse proxy** that Authelia (Phase 4) needs.

---

## 🔐 Phase 4 — Replace Firebase Auth with Authelia

**Recommendation for 8 GB: Authelia** (single container, ~100 MB RAM). Authentik is more featureful (admin UI, user self-service) but wants PostgreSQL **and** Redis — heavy for this box; choose it only if you outgrow Authelia.

Current state: `js/firebase.js` does Google Sign-In with a mock fallback, and `js/ui.js` degrades gracefully when Firebase is missing. That graceful path is your migration path.

### Steps
1. Deploy **Authelia** (via Coolify) with:
   ```yaml
   # excerpt from the Phase-4 compose (documented here — full file lands with the phase)
   authelia:
     image: authelia/authelia:latest
     volumes:
       - ./authelia:/config
     environment:
       - TZ=Asia/Kolkata
   ```
2. Configure `/config/configuration.yml`: users file (bcrypt-hashed passwords) or LDAP, `jwt_secret`, `session` settings. Two-factor via TOTP/WebAuthn.
3. Put **Caddy or Traefik** (Coolify already manages this) in front of FarmHealth and enable `forward_auth` → Authelia for `/admin` routes while keeping the map public.
4. Replace `js/firebase.js` logic: the app already treats auth as optional (login buttons show/hide via `FH_FIREBASE` checks). Either:
   - **Option A (simplest):** Keep the app's built-in `admin/user` role login for the app UI, and put Authelia only at the *reverse-proxy* layer (protects the whole site). No frontend changes needed.
   - **Option B:** Rewrite `js/firebase.js` as `js/auth.js` calling an `/api/auth/*` session backend backed by Authelia/Postgres. More work; do it only if you need per-user saved farms synced server-side.
5. Remove the Firebase `<script>` tags in `index.html` (lines 20–23) once Option B is done. Until then, leave them — the app works with or without.

---

## 🛰️ Phase 5 — Replace Sentinel Hub with STAC + Open Data Cube

**Reality check:** Open Data Cube (ODC) is a real, powerful stack (Python + PostgreSQL + xarray) but it's *heavy*: a full deployment with a local Sentinel-2 archive and STAC ingestion realistically wants 16+ GB and many GB of storage per region-month. On the 8 GB box, run ODC **as a catalog/index service** backed by remote data, not as a raw-data downloader.

### Staged approach (recommended)
1. **Now (already done in this repo):** STAC **discovery** already runs against `earth-search.aws.element84.com/v1` (`js/api.js` → `fetchScenes()`). Keep it.
2. **Do this next (free, no hardware):** swap the Sentinel Hub **Process/Statistics** calls for **Copernicus Data Space Ecosystem** (ESA's free S3 + STAC + `sentinelhub`-style processing at `https://dataspace.copernicus.eu`). Free API key from `https://identity.dataspace.copernicus.eu`. This removes the Sentinel Hub paid quota with a like-for-like HTTP swap in `js/api.js` + the token proxy.
3. **True self-host (later):** deploy **STAC + ODC** as Docker services:
   ```yaml
   stac-fastapi:    # STAC catalog API (uses PostGIS for index)
   odc:             # Open Data Cube — index/query your region's Sentinel-2 tiles
   ```
   Ingest only your state/district bbox (e.g. "Uttar Pradesh wheat belt") so storage stays bounded (~a few GB/month per district at 10 m).
4. The GEE proxy in `server/server.js` is already a *de-facto* Sentinel Hub replacement for NDVI/EVI/SAR/time-series when its service account is configured — use it as the immediate fallback while ODC comes up.

### Data source priority after Phase 5
```
Ollama-served analysis ← crop advice
GEE proxy (server)     ← quick NDVI/SAR now
Copernicus Data Space  ← free, unlimited, direct STAC + processing
ODC (self-hosted)      ← long-term: local catalog + time-series at scale
```

---

## 🌱 Phase 6 — Photo-based crop disease detection (LLaVA)

> "Allow farmers to upload field photos — run LLaVA (vision LLM) to detect disease."

**Model for an 8 GB CPU box:** `llava-phi3` (~2.9 GB) — the pragmatic pick. `llava:7b`/`llava:13b` exist but are painfully slow on CPU; `moondream` (~1.7 GB) is the ultra-light alternative.

### Status: backend ✅ implemented, frontend 🔜
1. **Backend (done)** — `POST /api/vision-analysis` in `server/server.js`:
   - Takes `{ imageBase64, crop, fieldName, ndvi, weather }` (base64 JSON, body limit raised to 20 MB).
   - Sends the image to Ollama's `/api/generate` with model **`llava-phi3`** (env-overridable via `OLLAMA_VISION_MODEL`; default tuned for the 8 GB laptop — do *not* use `llava:13b` on CPU).
   - Asks for structured JSON (health status, disease, confidence, severity, symptoms, recommendations) and parses it.
   - Graceful fallback: if LLaVA is unavailable it returns setup instructions instead of failing.
   - Test: `curl -X POST http://<laptop-ip>:8080/api/vision-analysis -H "Content-Type: application/json" -d '{}'` → `400 No image provided`.
   - Pull the model once: `ollama pull llava-phi3`.
2. **Frontend (remaining)** — a "📷 Diagnose from photo" button near the AI card in `index.html` (`<input type="file" accept="image/*" capture="environment">`), read the file as base64, post to `/api/vision-analysis`, render the returned JSON + recommendations.
3. **Cold-start UX:** first LLaVA call loads the model into RAM (~3 GB) — show a "loading vision model…" state; keep the model warm via `OLLAMA_KEEP_ALIVE` (already set in the compose stack).

---

## 📈 Phase 7 — Monitoring, backups, security (running list)

- **Uptime Kuma** → Phase 3 (done). Add a **status page** and share the link with farmers.
- **Backups:** nightly `pg_dump` of PostGIS to the laptop disk + weekly `rclone` copy to a free B2/OneDrive bucket. Back up `authelia/` config too (losing it locks everyone out).
- **Ollama models:** store on an external USB if the laptop disk is small (`ollama set model-dir` or symlink `/usr/share/ollama/.ollama/models`).
- **Security:** Tailscale for admin; Coolify behind it; never expose the Ollama port (`11434`) publicly — it has no auth.
- **Power:** a cheap UPS or at least the laptop battery as natural UPS; set `autosuspend` off and `logind` lid=ignore (Phase 1).

---

## 🗺️ Suggested execution order (your 1-weekend plan)

| Day | Phase | Deliverable |
|---|---|---|
| Day 1 | 0 + 1 | Laptop always-on: lid config, Docker, Tailscale, swap |
| Day 2 | 2 | Ollama + `deepseek-r1:7b`; `npm start`; advice works end-to-end |
| Day 3 | 3 | `docker-compose.selfhost.yml` up; Uptime Kuma monitors + Telegram alerts |
| Day 4 | 4 | Authelia + reverse proxy; kill the Firebase tabs |
| Day 5 | 5 | Copernicus Data Space swap (free, big win) |
| Later | 6–7 | LLaVA photo diagnosis; ODC catalog; backups |

---

## 🧾 Appendix A — About some names on your list

| Name | Verdict |
|---|---|
| **Ollama** | ✅ Real, standard — use it. |
| **DeepSeek-R1-Distill-Qwen-7B** | ✅ Real model, on Ollama as `deepseek-r1:7b`. Perfect for 8 GB. |
| **LLaVA** | ✅ Real vision LLM family on Ollama (`llava-phi3` for CPU). |
| **Open Data Cube / STAC API** | ✅ Real CEOS stack. Heavy; Phase 5 staging applies. |
| **Authentik / Authelia** | ✅ Both real. Authelia fits 8 GB. |
| **Coolify / Dokploy / Proxmox / Uptime Kuma** | ✅ All real. Proxmox skipped on 8 GB (Phase 0). |
| **AirLLM** (`airllm`) | ✅ Real library (lyogavin/airllm) for running big LLMs on low-RAM machines via layer-by-layer inference — great for *experiments* on this laptop, but too slow for a 24×7 server. Ollama is the server. |
| **DeepSeek-Reasonix, Embabel Agent Framework, Omnigent** | ⚠️ I could not verify these as established projects — they may be from an AI-generated tool list. If you have links, share them and I'll evaluate; nothing in this plan depends on them. |

---

## 🧾 Appendix B — Quick reference commands

```bash
# Ollama
ollama pull deepseek-r1:7b          # or qwen2.5:3b for lighter
ollama list
curl http://localhost:11434/api/tags

# FarmHealth server
cd server && npm install && npm start          # → http://localhost:3001

# Self-host stack
docker compose -f docker-compose.selfhost.yml up -d --build
docker compose -f docker-compose.selfhost.yml logs -f ollama

# Test the AI chain (Ollama → Gemini → expert fallback)
curl -X POST http://localhost:3001/api/gemini-analysis \
  -H "Content-Type: application/json" \
  -d '{"crop":"Wheat","ndvi":0.62,"soilPh":6.4,"soilNitrogen":118,"growthStage":"mid"}'

# AI + Ollama health (Uptime Kuma probe)
curl http://localhost:3001/api/ai/health
```
