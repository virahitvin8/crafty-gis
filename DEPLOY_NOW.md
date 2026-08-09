# ⚡ Deploy FarmHealth NOW

> **Your stack (chosen):** 🥇 **Netlify (frontend) + Render (backend)** — primary,
> live today. 🛟 **Docker (self-hosted)** — backup/offline/advanced path.
> (Dokploy remains an optional all-in-one alternative — see `DOKPLOY_DEPLOY.md`.)

---

## 🥇 PRIMARY: Netlify + Render (live now)

**Best for**: the always-free, zero-maintenance setup you're running today —
`https://farmhealth1-backend.onrender.com` + your Netlify site.

### Backend — Render (already deployed)

```
1. render.com → New → Blueprint → select repo (render.yaml auto-detects)
2. Environment tab → add secrets (mark Secret):
     GEE_SERVICE_ACCOUNT
     GEE_PRIVATE_KEY        ← ONE line, \n escapes intact
     GEMINI_API_KEY
     SENTINEL_HUB_CLIENT_ID / _SECRET   (optional fallbacks)
3. Manual Deploy → Deploy latest commit
4. Verify:
     https://farmhealth1-backend.onrender.com/api/health
     https://farmhealth1-backend.onrender.com/api/gee/health
```

### Frontend — Netlify (already deployed)

```
1. app.netlify.com → Add new site → Import from Git → select repo
2. Build settings: publish directory = ".", branch = main
3. Deploy — netlify.toml already proxies /api/* → Render (zero config)
4. Live at your Netlify URL (e.g. https://fastidious-yeot-0c0d83.netlify.app)
```

**Update flow:** `git push origin main` → Netlify rebuilds the frontend;
Render redeploys the backend (or trigger via Manual Deploy).

---

## 🛟 BACKUP: Docker (self-hosted)

**Best for**: a VPS/laptop you control, offline use, or if Netlify/Render
ever have an outage or free-tier limits bite.

### Single server (simplest)

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Clone + configure
git clone https://github.com/virahitvin8/crafty-gis.git farmhealth
cd farmhealth
# export secrets into the shell (see docker-compose.selfhost.yml header —
# no .env mounts, they break the GEE key):
set -a; source .env; set +a

# 3. Deploy the full stack (app+backend, Ollama, PostGIS, Uptime Kuma)
docker compose -f docker-compose.selfhost.yml --env-file /dev/null up -d --build

# 4. Access
#   App:  http://your-server-ip:8080
#   Monitoring: http://your-server-ip:3002 (Uptime Kuma)
#   Logs: docker compose -f docker-compose.selfhost.yml logs -f
```

> `--env-file /dev/null` matters: without it, Docker Compose auto-loads the
> repo `.env` and rejects `GEE_PRIVATE_KEY`'s `\n` escapes. Details in the
> compose file header and `SELFHOST_MIGRATION.md`.

### With Dokploy (optional all-in-one, GUI + HTTPS + auto-deploy)

```
scripts/install-dokploy.sh   →  one-command install (provisions + installs + project)
docker-compose.dokploy.yml   →  the stack as a Dokploy resource
.github/workflows/deploy-dokploy.yml → auto-deploy on push (needs DOKPLOY_DEPLOY_URL secret)
```
Full walkthrough: `DOKPLOY_DEPLOY.md` · Oracle Free Tier ($0): `ORACLE_CLOUD_DOKPLOY.md`

---

## 📊 Comparison (why this order)

| Feature | Netlify+Render | Docker self-host | Dokploy |
|---------|----------------|------------------|---------|
| Cost | **$0** | VPS (~$5–10/mo or free Oracle) | VPS cost |
| Effort | **Lowest — live now** | Medium | Medium |
| 24/7 uptime | Backend sleeps after 15 min free-tier | ✅ Always-on | ✅ Always-on |
| HTTPS | ✅ Auto | ⚠️ Manual (or Traefik) | ✅ Auto |
| Auto-deploy on push | ✅ Native | ⚠️ Script it | ✅ Workflow included |
| Offline / no internet | ❌ | ✅ Full stack runs locally | ✅ |
| Monitoring | ❌ | Uptime Kuma in stack | ✅ Built-in |

---

## ✅ What's Already Done

- ✅ **Live:** Render backend (`farmhealth1-backend.onrender.com`) + Netlify site
- ✅ `render.yaml` (Render blueprint with GEE/Gemini/Sentinel secrets)
- ✅ `netlify.toml` (`/api/*` proxy → Render, publish dir `.`)
- ✅ `Dockerfile` + `docker-compose.selfhost.yml` (full backup stack)
- ✅ `docker-compose.dokploy.yml` + `scripts/install-dokploy.sh` + CI workflow
- ✅ `www/` built and in sync (Netlify serves it)
- ✅ All docs cross-linked below

---

## 📖 Guides

- **Netlify + Render (primary):** `DEPLOY.md`, `DEPLOYMENT.md`
- **Docker self-host (backup):** `SELFHOST_MIGRATION.md`, `docker-compose.selfhost.yml`
- **Dokploy (optional):** `DOKPLOY_DEPLOY.md` · `ORACLE_CLOUD_DOKPLOY.md` (free tier)
- **Coolify (optional):** `COOLIFY_DEPLOY.md`

---

## 🚀 Deploy Now

1. **Backend:** render.com → Blueprint → apply → add secrets → deploy
2. **Frontend:** app.netlify.com → import repo → deploy
3. **Backup:** Docker compose on any server (commands above)
