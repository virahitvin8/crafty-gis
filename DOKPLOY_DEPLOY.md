# 🚀 Deploy Crafty GIS on Dokploy (self-hosted PaaS)

> Dokploy is a free, open-source self-hosted alternative to Coolify/Render.
> This guide deploys the full Crafty GIS stack — app + backend, Ollama
> (self-hosted AI), PostGIS, and Uptime Kuma — from **this repo**, with HTTPS.

**Stack delivered by `docker-compose.dokploy.yml`:**

| Service | Port | Purpose |
|---|---|---|
| crafty_gis | 8080 | App + Node backend (built from this repo's Dockerfile) |
| ollama | 11434 | Self-hosted LLM + vision (internal network only) |
| postgis | 5432 | Saved farms / land records / future STAC index |
| uptime-kuma | 3002 | Monitoring + alerting (optional) |

---

## 📋 Prerequisites

- VPS / home server: **8 GB+ RAM** recommended (4 GB works with small models:
  set `OLLAMA_MODEL=deepseek-r1:1.5b`, `OLLAMA_VISION_MODEL=llava`)
- Ubuntu 22.04 / 24.04 (or Debian)
- Domain name (recommended for HTTPS) pointed at your server IP
- A **GitHub account** to import this repo into Dokploy

**Cheap VPS options:** Hetzner CX21/32 (~€5–10/mo), DigitalOcean $12 droplet,
Vultr $12 — or **$0/month on Oracle Cloud Always Free** (ARM Ampere, 24GB RAM)
using the step-by-step guide in `ORACLE_CLOUD_DOKPLOY.md`.

---

## Step 1 — Install Dokploy

### Option A — one-command script (recommended)

The repo ships `scripts/install-dokploy.sh`, which provisions the box
(packages + firewall + swap if RAM < 8 GB), installs Dokploy, waits for the
UI, and pre-creates the `crafty_gis` project:

```bash
# from your laptop: copy it up, then run it on the VPS
scp scripts/install-dokploy.sh root@YOUR_SERVER:/root/
ssh root@YOUR_SERVER "bash /root/install-dokploy.sh"
```

To also pre-create the project **automatically** via API, first make an API
token in Dokploy (Settings → API Tokens → Create), then:

```bash
ssh root@YOUR_SERVER "bash /root/install-dokploy.sh --api-token YOUR_TOKEN"
```

(If the API call isn't compatible with your Dokploy version, the script falls
back to printing the 30-second manual steps — the install itself still completes.)

### Option B — manual

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

This installs Dokploy (UI on port 3000), Docker Engine, Nginx reverse proxy,
and LetsEncrypt. Takes ~2–3 minutes.

Then open `http://your-server-ip:3000`, create the admin account, and you're in.

---

## Step 2 — Create the project + stack

1. **Projects → Create Project** → name `crafty_gis`.
2. Inside it, **Add Resource → Docker Compose**.
3. Connect your GitHub account and select this repository
   (`virahitvin8/crafty-gis`, branch `main`), **or** paste the contents of
   `docker-compose.dokploy.yml` directly.
4. **Docker Compose Path**: `docker-compose.dokploy.yml` (if using the repo).
5. Create.

> **Why this file?** It builds Crafty GIS from the repo's own `Dockerfile`,
> so you always run your latest code — no registry image to keep in sync.

---

## Step 3 — Add secrets (do NOT mount .env)

Dokploy injects environment variables directly into the container. In your
`crafty_gis` service → **Environment** tab, add:

```bash
# ── Self-hosted AI (defaults are fine) ──
OLLAMA_MODEL=deepseek-r1:7b
OLLAMA_VISION_MODEL=llava-phi3

# ── Google Earth Engine (free satellite source) ──
GEE_SERVICE_ACCOUNT=gee-backend-account@braided-analyst-500314-c5.iam.gserviceaccount.com
GEE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIB...\n-----END PRIVATE KEY-----

# ── Optional cloud fallbacks ──
GEMINI_API_KEY=your_key
SENTINEL_HUB_CLIENT_ID=your_id
SENTINEL_HUB_CLIENT_SECRET=your_secret

# ── Postgres (optional, compose defaults to crafty_gis/crafty_gis) ──
POSTGRES_USER=crafty_gis
POSTGRES_PASSWORD=change-me
POSTGRES_DB=crafty_gis
```

**GEE key tip:** paste it as **one single line** with the `\n` escapes intact
(exactly like the Render dashboard value). Dokploy passes it verbatim into the
container — the container-side code unescapes it. Do **not** paste a
multi-line PEM and do not rely on a `.env` mount (compose interpolation chokes
on `\n` inside `.env` values).

Save, then **Deploy**. First deploy takes ~5–10 minutes (Docker build + Ollama
model pulls).

---

## Step 4 — Verify

- App: `http://your-server-ip:8080`
- Health: `http://your-server-ip:8080/api/health` → `{"status":"ok",...}`
- GEE: `http://your-server-ip:8080/api/gee/health` → `{"status":"connected","initialized":true}`
- AI: `http://your-server-ip:8080/api/ai/health` → Ollama-backed advice works
- Monitoring: `http://your-server-ip:3002` (Uptime Kuma — set up admin + monitors)

---

## Step 5 — HTTPS with a domain

1. DNS: add an **A record** `crafty_gis.yourdomain.com → your-server-ip`.
2. In Dokploy: **Domains → Add Domain** on the `crafty_gis` service →
   `crafty_gis.yourdomain.com` → enable **Auto SSL** (LetsEncrypt) → save.
3. Dokploy auto-proxies and renews the certificate.

Result: `https://crafty_gis.yourdomain.com` 🌐

---

## 🔄 Updating

- Push to `main` → Dokploy **auto-deploys** if you enabled the webhook
  (Service → Settings → Git → auto-deploy on push).
- Or: Service → **Redeploy**.
- Secrets persist across redeploys (stored in Dokploy, not the repo).

---

## 🤖 CI/CD: auto-deploy on every push to main (GitHub Actions)

The repo ships `.github/workflows/deploy-dokploy.yml`. It runs `build.sh`
(fail-fast on broken builds), then triggers your Dokploy deployment via its
**deploy hook**.

### One-time setup (2 minutes)

1. **Get the deploy hook URL** — Dokploy dashboard → your `crafty_gis`
   application → **Settings → Advanced → Deploy Hook / Deploy Token**.
   It looks like `https://dokploy.yourdomain.com/api/deploy/<random-token>`.
2. **Add the secret** — GitHub repo → **Settings → Secrets and variables →
   Actions** → **New repository secret**:
   - `DOKPLOY_DEPLOY_URL` = the full deploy-hook URL from step 1

   (If your Dokploy version gives a bare token instead, set
   `DOKPLOY_DEPLOY_URL` = `https://dokploy.yourdomain.com/api/deploy` and
   `DOKPLOY_DEPLOY_TOKEN` = the token.)

### How it works

| Step | Action |
|---|---|
| Trigger | `push` to `main` (or manual **Run workflow**) |
| Verify | `bash build.sh` + `node --check` on all JS — a broken build fails the job before anything deploys |
| Deploy | `curl` to the deploy hook (POST, falls back to GET; token is redacted from logs) |
| Result | Dokploy rebuilds and restarts the `crafty_gis` service with your new code |

Secrets never appear in the repo or the logs — they live only in GitHub
Actions → Secrets.

> **Manual run:** Actions tab → *Deploy to Dokploy* → **Run workflow** — handy
> for redeploying without a code change.

---

## 🧰 Useful commands (SSH)

```bash
# Stack status
docker compose -f docker-compose.dokploy.yml ps

# Logs
docker compose -f docker-compose.dokploy.yml logs -f crafty_gis

# Restart one service
docker compose -f docker-compose.dokploy.yml restart ollama

# Pull/swap a model manually
docker exec -it <ollama-container> ollama pull deepseek-r1:7b
```

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `Bind for 0.0.0.0:8080 failed` | `sudo lsof -i :8080` → kill the process, redeploy |
| Containers keep restarting (`OOMKilled`) | Add 8 GB swap (see below) or lower `OLLAMA_MODEL` |
| `pull model manifest: file does not exist` | SSH → `docker exec -it <ollama> ollama pull deepseek-r1:7b` |
| SSL fails | Open ports 80/443, confirm DNS points to the server, retry in 10 min |
| GEE `invalid_grant` | Re-paste `GEE_PRIVATE_KEY` as a single line with `\n` escapes; verify the service account email |
| App loads but satellite map stays DEMO | Check `/api/gee/health`; GEE init takes ~10–30 s on cold start |

**Add swap (8 GB):**

```bash
sudo fallocate -l 8G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## ✅ Checklist

- [ ] Dokploy installed, dashboard at `:3000`
- [ ] Project `crafty_gis` created
- [ ] `docker-compose.dokploy.yml` deployed (build from repo)
- [ ] Secrets added (GEE + Ollama models + optional cloud fallbacks)
- [ ] First deploy green: `/api/health`, `/api/gee/health`, `/api/ai/health`
- [ ] (Optional) Domain + HTTPS
- [ ] (Optional) Uptime Kuma monitors: `/api/health`, `/api/gee/health`, `/api/ai/health`, port 8080

---

## 📚 Resources

- Dokploy docs: https://docs.dokploy.com · GitHub: https://github.com/Dokploy/dokploy
- Crafty GIS repo: https://github.com/virahitvin8/crafty-gis
- Sibling stacks: `docker-compose.selfhost.yml` (always-on laptop),
  `docker-compose.coolify.yml` (Coolify)
