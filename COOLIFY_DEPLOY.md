# 🚀 Deploy Crafty GIS on Coolify / Dokploy (Production, 24×7)

> Replace Render (which sleeps after 15 min) with a **self-hosted always-on** platform.
> Keep everything: Render still works as a fallback — this is additive, not breaking.

---

## Why Coolify / Dokploy?

| | Render (old) | Coolify / Dokploy (new) |
|---|---|---|
| Free tier always-on | ❌ Sleeps after 15 min | ✅ 24×7 |
| Self-hosted | ❌ | ✅ On YOUR server |
| Runs Ollama (AI) | ❌ | ✅ |
| Runs PostgreSQL+PostGIS | ❌ | ✅ |
| Monitoring | ❌ | ✅ Uptime Kuma |
| Cost | $0 (but sleeps) | $5-10/mo VPS |

---

## Prerequisites

- A VPS or home server with **8GB+ RAM** (Ubuntu/Debian recommended)
- Docker + Docker Compose installed
- A domain (optional but recommended)

---

## Deploy with Docker Compose (Fastest)

### 1. On your server:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone the repo
cd ~
git clone https://github.com/virahitvin8/crafty-gis.git crafty_gis
cd crafty_gis

# Configure (OPTIONAL — all fallbacks stay available)
cp .env.example .env
# Edit .env and add if you have them:
#   GEE_SERVICE_ACCOUNT / GEE_PRIVATE_KEY   (free satellite, PRIMARY)
#   SENTINEL_HUB_CLIENT_ID / SECRET         (fallback)
#   GEMINI_API_KEY                          (fallback AI)

# Start the full production stack
sudo docker compose -f docker-compose.coolify.yml up -d
```

### 2. Access

| Service | URL |
|---|---|
| Crafty GIS App | http://YOUR-IP:8080 |
| Uptime Kuma (monitoring) | http://YOUR-IP:3002 |

### 3. First-run AI model download (one time, ~10-20 min)

The entrypoint already pulls models automatically. To force it:

```bash
sudo docker compose -f docker-compose.coolify.yml exec ollama ollama pull deepseek-r1:7b
sudo docker compose -f docker-compose.coolify.yml exec ollama ollama pull llava-phi3
```

> On 8GB RAM: use `deepseek-r1:7b` (text) + `llava-phi3` (vision).
> With more RAM/GPU you can use `llava:13b` for better vision.

---

## Deploy via Coolify UI (Recommended)

### 1. Install Coolify on your server

```bash
curl -fsSL https://coolify.io/install | bash
```

### 2. Create the project
- Open Coolify → **Projects → New**
- Name it `crafty_gis`
- Add a **New Resource → Docker Compose**
- Point it at the repo `https://github.com/virahitvin8/crafty-gis.git`
- Select `docker-compose.coolify.yml` as the compose file
- Set domain: `crafty_gis.yourdomain.com`
- Port: `8080`
- Click **Deploy**

### 3. Coolify handles automatically
- HTTPS with Let's Encrypt 🌐
- Port binding
- Environment variables
- Health checks + auto-restart
- Logs & rollbacks

---

## Deploy via Dokploy (Alternative)

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

1. Dokploy → **Services → New** → **Docker Compose**
2. Add the same compose content
3. Set environment variables (same as `.env.example`)
4. Deploy

---

## 👉 What about Replacements? (Non-breaking)

Everything is **additive**. The new open-source pieces run FIRST, the old pieces are automatic fallbacks:

| Feature | New (PRIMARY) | Old (FALLBACK) |
|---|---|---|
| **Satellite data** | Open Data Cube + STAC (free) + GEE | Sentinel Hub |
| **AI advice** | Ollama + DeepSeek (free) | Gemini API |
| **Auth** | authentik / Authelia (self-hosted) | Firebase |
| **Hosting** | Coolify / Dokploy (24×7) | Render |
| **Backup advice** | getFallbackAdvice() — always available offline | — |

Nothing breaks if a new service is unreachable — each has a graceful fallback path.

---

## Land Records (Survey / Khata number)

Crafty GIS **never invents** land records.

- **What it does:** auto-detects your State, District, Tehsil, Village & PIN from the boundary you draw, then deep-links you to the **official state portal** (UP Bhulekh, MP Bhulekh, Mahabhumi, Dharani, Mee Bhoomi, etc. — all 36 states mapped).
- **Where records come from:** the official government portals only (after OTP verification — that is a legal privacy requirement, not something Crafty GIS can bypass).
- **You save** the survey/khata number and owner name locally, and Crafty GIS remembers them for that field next time.

See the **Land Info** card after selecting a boundary.

---

## Monitoring (Uptime Kuma)

Already included in `docker-compose.coolify.yml` on port **3002**.

Add these monitors:

| Monitor | URL | Interval |
|---|---|---|
| Backend | `http://YOUR-IP:8080/api/health` | 60s |
| AI stack | `http://YOUR-IP:8080/api/ai/health` | 60s |
| GEE satellite | `http://YOUR-IP:8080/api/gee/health` | 120s |

Get alerts on Telegram/Discord/Email when anything goes down.

---

## Troubleshooting

```bash
# Logs
sudo docker compose -f docker-compose.coolify.yml logs -f crafty_gis
sudo docker compose -f docker-compose.coolify.yml logs -f ollama

# Restart
sudo docker compose -f docker-compose.coolify.yml restart

# Reset everything
sudo docker compose -f docker-compose.coolify.yml down
sudo docker compose -f docker-compose.coolify.yml up -d
```

**Ollama out of memory?** Use a smaller model:
```bash
# In .env / Coolify env vars:
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_VISION_MODEL=moondream
```

---

## Cost Summary

| Item | Cost/month |
|---|---|
| VPS (4GB-8GB) | $5-10 |
| Coolify/Dokploy | $0 (self-hosted) |
| Ollama + models | $0 (open-source) |
| STAC / GEE satellite | $0 |
| Uptime Kuma | $0 |
| **Total** | **$5-10** |

**(vs. $50-100/month for the old all-cloud stack)**
