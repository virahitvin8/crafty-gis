# 🚀 Deploy FarmHealth on Dokploy (Open-Source Coolify Alternative)

> Dokploy is the best open-source alternative to Coolify — same features, 100% free, self-hosted.
> This guide gets FarmHealth running in **5 minutes** with HTTPS, monitoring, and auto-restart.

---

## 📋 Prerequisites

- A VPS or home server with **8GB+ RAM** (Ubuntu 22.04/24.04 recommended)
- Domain name (optional but recommended for HTTPS)
- SSH access to your server

**VPS Recommendations**:
- DigitalOcean: $12/month droplet (4GB RAM) — use 8GB for better performance
- Vultr: $12/month instance
- Hetzner: €10/month CX21 (best value)
- Oracle Cloud: Free tier (4GB RAM, enough for testing)

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Dokploy on Your Server

SSH into your server and run:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

This installs:
- Dokploy UI (port 3000)
- Docker Engine
- Nginx (reverse proxy)
- LetsEncrypt (HTTPS certificates)

**Time**: ~2-3 minutes

---

### Step 2: Access Dokploy Dashboard

1. Open browser: `http://your-server-ip:3000`
2. Create admin account (first time only)
3. You’ll see the Dokploy dashboard

---

### Step 3: Create FarmHealth Project

1. Click **"Projects"** → **"Create Project"**
2. Name: `farmhealth`
3. Click **"Create"**

---

### Step 4: Deploy FarmHealth

#### Option A: Git-Based Deploy (Recommended)

1. Inside the `farmhealth` project, click **"Add Resource"** → **"Git Repository"**
2. Fill in:
   - **Name**: `farmhealth-app`
   - **Repository**: `https://github.com/virahitvin8/crafty-gis.git`
   - **Branch**: `main`
   - **Docker Compose Path**: `docker-compose.coolify.yml`
3. Click **"Create"**

#### Option B: Manual Docker Compose Deploy

1. Inside the `farmhealth` project, click **"Add Resource"** → **"Docker Compose"**
2. Name: `farmhealth-stack`
3. Paste the contents of `docker-compose.coolify.yml`
4. Click **"Create"**

---

### Step 5: Add Environment Variables

After creating the service:

1. Click on your `farmhealth-app` service
2. Go to **"Environment"** tab
3. Add these variables:

```bash
# Required — get from your .env file
SENTINEL_HUB_CLIENT_ID=your_client_id_here
SENTINEL_HUB_CLIENT_SECRET=your_client_secret_here
GEMINI_API_KEY=your_gemini_key_here
GEE_SERVICE_ACCOUNT=your_service_account_email@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY=your_private_key_here

# Optional — self-hosted AI
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:7b
OLLAMA_VISION_MODEL=llava-phi3

# Server settings
NODE_ENV=production
PORT=3001
```

4. Click **"Save"**

---

### Step 6: Deploy!

1. Go to **"Deployments"** tab
2. Click **"Deploy"** button
3. Watch the logs — Dokploy builds and starts the stack

**First deploy takes ~5-10 minutes** (pulling Ollama models).

---

### Step 7: Access Your FarmHealth Instance

After deployment completes:

- **FarmHealth App**: `http://your-server-ip:8080`
- **Dokploy Dashboard**: `http://your-server-ip:3000`
- **Uptime Kuma** (monitoring): `http://your-server-ip:3002`

---

## 🔒 Enable HTTPS (Custom Domain)

### Step 1: Point Domain to Server

In your domain registrar (GoDaddy, Namecheap, etc.):

- Add A record: `farmhealth.yourdomain.com` → `your-server-ip`
- Wait 5-10 minutes for DNS propagation

### Step 2: Configure Dokploy

1. In Dokploy, go to **"Domains"** → **"Add Domain"**
2. Select your `farmhealth-app` service
3. Enter: `farmhealth.yourdomain.com`
4. Check **"Auto-generate SSL certificate"** (LetsEncrypt)
5. Click **"Save"**

**Dokploy automatically**:
- Obtains SSL certificate
- Configures Nginx reverse proxy
- Redirects HTTP → HTTPS
- Renews certificates automatically

**Result**: `https://farmhealth.yourdomain.com` 🌐

---

## 📊 Dokploy Features You Get

| Feature | Status | Description |
|---------|--------|-------------|
| **One-Click Deploy** | ✅ | Git-based or manual compose deploy |
| **HTTPS** | ✅ | Automatic LetsEncrypt certificates |
| **Auto-Restart** | ✅ | Containers restart on failure |
| **Logs** | ✅ | Real-time log streaming |
| **Environment Variables** | ✅ | Secure secret management |
| **Monitoring** | ✅ | CPU, RAM, network usage |
| **Backups** | ✅ | Schedule automated backups |
| **Databases** | ✅ | Built-in PostgreSQL, MySQL, Redis |
| **Multi-App** | ✅ | Deploy multiple apps on same server |

---

## 🛠️ Useful Dokploy Commands

### View Logs
```bash
# SSH into server, then:
docker logs dokploy-server -f

# Or view specific service logs:
docker logs farmhealth-farmhealth-app-1 -f
```

### Restart Service
```bash
# Via Dokploy UI:
# Service → Actions → Restart

# Or via CLI:
docker restart farmhealth-farmhealth-app-1
```

### Update FarmHealth
```bash
# Via Dokploy UI:
# Service → Deployments → Redeploy

# Or pull latest code and redeploy:
docker compose -f /etc/dokploy/compose.yaml pull
```

---

## 🔧 Troubleshooting

### Port 8080 Already in Use

**Error**: `Bind for 0.0.0.0:8080 failed: port is already allocated`

**Fix**:
```bash
# SSH into server
sudo lsof -i :8080
sudo kill -9 <PID>
# Then redeploy in Dokploy
```

### Out of Memory (OOM)

**Error**: Containers keep crashing, logs show `OOMKilled`

**Fix**: Add swap:
```bash
# SSH into server
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# Make permanent:
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Ollama Models Not Loading

**Error**: `pull model manifest: file does not exist`

**Fix**: Manually pull models:
```bash
# SSH into server
docker exec -it farmhealth-ollama-1 ollama pull deepseek-r1:7b
docker exec -it farmhealth-ollama-1 ollama pull llava-phi3
```

### SSL Certificate Failed

**Error**: `letsencrypt: authorization failed`

**Fix**:
1. Ensure port 80/443 are open in firewall
2. Ensure domain DNS is pointing to server IP
3. Wait 10 minutes and retry

---

## 📈 Monitoring with Uptime Kuma

FarmHealth stack includes **Uptime Kuma** (port 3002) for monitoring.

### Access Uptime Kuma
```
http://your-server-ip:3002
```

### Add Monitors

1. Login to Uptime Kuma
2. Click **"Add New Monitor"**
3. Add these monitors:

| Monitor Name | URL | Interval |
|---|---|---|
| Backend Health | `http://localhost:3001/api/health` | 60s |
| AI Stack | `http://localhost:3001/api/ai/health` | 60s |
| GEE Satellite | `http://localhost:3001/api/gee/health` | 120s |
| Frontend | `http://localhost:8080` | 60s |

4. Set up notifications (Telegram, Discord, Email, Slack)

---

## 🔄 Updating FarmHealth

### Automatic Updates (Git Webhook)

1. In Dokploy, go to your service → **"Settings"** → **"Git"**
2. Enable **"Auto-deploy on push"**
3. Now every push to `main` branch auto-deploys!

### Manual Update

1. Go to service → **"Deployments"**
2. Click **"Redeploy"**

---

## 🗄️ Database Setup (Optional)

FarmHealth uses **localStorage** by default (no database needed).

If you want cloud sync across devices:

### Add PostgreSQL to Dokploy

1. In Dokploy, click **"Add Resource"** → **"Database"** → **"PostgreSQL"**
2. Name: `farmhealth-db`
3. Create database: `farmhealth`
4. Create user: `farmhealth_user`
5. Set password

### Update docker-compose.coolify.yml

Add this to your compose file:

```yaml
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: farmhealth
      POSTGRES_USER: farmhealth_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
```

Then update the backend service to use it.

---

## 🌟 Pro Tips

### 1. Resource Limits

In Dokploy, set resource limits to prevent OOM:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 2G
```

### 2. Backup Strategy

Dokploy has built-in backups:

1. Go to **"Backups"** → **"Schedule Backup"**
2. Frequency: Daily
3. Retention: 7 days
4. Storage: Local or S3

### 3. Multiple Environments

Deploy staging + production:

1. Create branch `staging` in GitHub
2. In Dokploy, create second service pointing to `staging` branch
3. Test on staging, merge to main for production

### 4. CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Dokploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Trigger Dokploy Deploy
        run: |
          curl -X POST https://dokploy.yourdomain.com/api/deploy \
            -H "Authorization: Bearer ${{ secrets.DOKPLOY_API_KEY }}" \
            -d '{"serviceId": "your-service-id"}'
```

---

## 📚 Additional Resources

- **Dokploy Docs**: https://docs.dokploy.com
- **Dokploy GitHub**: https://github.com/Dokploy/dokploy
- **FarmHealth GitHub**: https://github.com/virahitvin8/crafty-gis
- **Docker Compose Ref**: https://docs.docker.com/compose/

---

## ✅ Deployment Checklist

- [ ] Server provisioned (8GB+ RAM, Ubuntu 22.04/24.04)
- [ ] Dokploy installed (`curl -sSL https://dokploy.com/install.sh | sh`)
- [ ] Dokploy dashboard accessible (`http://server-ip:3000`)
- [ ] FarmHealth project created
- [ ] Git repository connected (`virahitvin8/crafty-gis`)
- [ ] Docker Compose file selected (`docker-compose.coolify.yml`)
- [ ] Environment variables added (secrets from .env)
- [ ] First deployment completed
- [ ] FarmHealth accessible at `http://server-ip:8080`
- [ ] (Optional) Domain pointed to server
- [ ] (Optional) HTTPS enabled in Dokploy
- [ ] (Optional) Uptime Kuma configured with monitors

---

## 🎉 You're Done!

FarmHealth is now running 24/7 on your Dokploy instance with:
- ✅ HTTPS (if domain configured)
- ✅ Auto-restart on failure
- ✅ Real-time logs
- ✅ Monitoring (Uptime Kuma)
- ✅ One-click updates
- ✅ Backup scheduling

**Total cost**: VPS ($5-10/month) + domain ($10/year) = **~$6/month**

**Total time**: 5-10 minutes

---

## 🆘 Need Help?

- **Dokploy Discord**: https://discord.gg/dokploy
- **FarmHealth Issues**: https://github.com/virahitvin8/crafty-gis/issues
- **Docker Docs**: https://docs.docker.com

