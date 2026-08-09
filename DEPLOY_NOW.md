# ⚡ Deploy FarmHealth NOW

## 🎯 Choose Your Deployment Method

---

## Option 1: Dokploy (RECOMMENDED - 24/7 Self-Hosted)

**Best for**: Always-on deployment, full control, $5-10/month

### Prerequisites
- VPS with 8GB+ RAM (DigitalOcean, Vultr, Hetzner, Oracle Cloud)
- Ubuntu 22.04/24.04
- SSH access

### Deployment Steps

```bash
# 1. SSH into your VPS
ssh root@your-server-ip

# 2. Install Dokploy (2 minutes)
curl -sSL https://dokploy.com/install.sh | sh

# 3. Access Dokploy dashboard
# Open browser: http://your-server-ip:3000
# Create admin account

# 4. Create project
# Projects → Create Project → Name: farmhealth

# 5. Add Git Repository
# Add Resource → Git Repository
# Repository: https://github.com/virahitvin8/crafty-gis.git
# Branch: main
# Docker Compose Path: docker-compose.coolify.yml

# 6. Add environment variables (from your .env file)
# Settings → Environment → Add variables:
# - SENTINEL_HUB_CLIENT_ID
# - SENTINEL_HUB_CLIENT_SECRET
# - GEMINI_API_KEY
# - GEE_SERVICE_ACCOUNT
# - GEE_PRIVATE_KEY

# 7. Deploy!
# Deployments → Deploy
# Wait 5-10 minutes (first time)

# 8. Access your app
# http://your-server-ip:8080
```

### Enable HTTPS (Optional)
```
# 1. Point domain to server (A record)
# 2. In Dokploy: Domains → Add Domain
# 3. Enter: farmhealth.yourdomain.com
# 4. Auto-generate SSL certificate
# 5. Done! https://farmhealth.yourdomain.com
```

---

## Option 2: Render + Netlify (FREE Tier)

**Best for**: Testing, no cost, no VPS needed

### Backend (Render)
```
1. Go to https://render.com
2. Sign in with GitHub
3. New → Blueprint
4. Select repo: virahitvin8/crafty-gis
5. Render auto-detects render.yaml
6. Add secrets (from .env file):
   - SENTINEL_HUB_CLIENT_ID
   - SENTINEL_HUB_CLIENT_SECRET
   - GEMINI_API_KEY
   - GEE_SERVICE_ACCOUNT
   - GEE_PRIVATE_KEY
7. Apply → Deploys in 3 minutes

Result: https://farmhealth1-backend.onrender.com
```

### Frontend (Netlify)
```
1. Go to https://app.netlify.com
2. Sign in with GitHub
3. Add new site → Import existing project
4. Select repo: virahitvin8/crafty-gis
5. Build settings:
   - Publish directory: .
   - Branch: main
6. Deploy site

Result: https://farmhealth1.netlify.app

Note: Netlify auto-proxies /api/* to Render backend
```

---

## Option 3: Docker Compose (Simplest)

**Best for**: Single server, no fancy UI

```bash
# On your server (Ubuntu/Debian):

# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Clone repo
git clone https://github.com/virahitvin8/crafty-gis.git farmhealth
cd farmhealth

# 3. Configure
cp .env.example .env
nano .env  # Add your secrets

# 4. Deploy
docker compose -f docker-compose.coolify.yml up -d

# 5. Access
# http://your-server-ip:8080

# 6. View logs
docker compose -f docker-compose.coolify.yml logs -f
```

---

## 📊 Quick Comparison

| Feature | Dokploy | Render+Netlify | Docker Compose |
|---------|---------|----------------|----------------|
| Cost | $5-10/month | Free | $5-10/month |
| 24/7 Uptime | ✅ Yes | ❌ Sleeps after 15min | ✅ Yes |
| HTTPS | ✅ Auto | ✅ Auto | ⚠️ Manual |
| Monitoring | ✅ Built-in | ❌ No | ⚠️ Manual |
| Auto-Restart | ✅ Yes | ✅ Yes | ✅ Yes |
| UI Dashboard | ✅ Beautiful | ⚠️ Separate | ❌ CLI only |
| Databases | ✅ Built-in | ⚠️ Add-on | ⚠️ Manual |
| Difficulty | Easy | Easiest | Medium |

---

## ✅ What's Already Done

- ✅ Code pushed to GitHub: https://github.com/virahitvin8/crafty-gis
- ✅ Commit: e7cdc26 (latest)
- ✅ Deployment configs ready:
   - `render.yaml` (Render backend)
   - `netlify.toml` (Netlify frontend)
   - `docker-compose.coolify.yml` (Dokploy/Coolify)
- ✅ Environment variables documented in `.env.example`
- ✅ All features built and tested

---

## 🎯 My Recommendation

**For production use**: **Dokploy**
- 24/7 uptime (Render sleeps)
- Full control
- Beautiful UI
- Built-in monitoring
- One-click updates

**For testing**: **Render + Netlify**
- Free
- 5 minutes setup
- No VPS needed

---

## 📖 Detailed Guides

- **Dokploy**: See `DOKPLOY_DEPLOY.md`
- **Coolify**: See `COOLIFY_DEPLOY.md`
- **Self-Hosted**: See `SELFHOST_MIGRATION.md`
- **General**: See `DEPLOYMENT.md`

---

## 🚀 Deploy Now

**Pick one and go**:

1. **Dokploy**: `ssh root@your-server && curl -sSL https://dokploy.com/install.sh | sh`
2. **Render**: https://render.com → New → Blueprint
3. **Netlify**: https://app.netlify.com → Add new site

**All methods use the same GitHub repo**: https://github.com/virahitvin8/crafty-gis

---

## 🆘 Quick Help

| Platform | Docs |
|----------|------|
| Dokploy | https://docs.dokploy.com |
| Render | https://render.com/docs |
| Netlify | https://docs.netlify.com |
| Docker | https://docs.docker.com |

