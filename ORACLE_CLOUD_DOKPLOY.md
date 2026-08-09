# 🚀 FarmHealth on Oracle Cloud Free Tier + Dokploy

**Cost**: $0/month (Oracle Cloud Free Tier)  
**Uptime**: 24/7 always-on  
**Performance**: 4GB RAM, 4 CPUs (sufficient for full stack)  
**Setup time**: ~20 minutes

---

## 📋 What You'll Get

- ✅ **Always-on** FarmHealth instance (no sleeping)
- ✅ **Auto HTTPS** with LetsEncrypt
- ✅ **One-click deploys** from GitHub
- ✅ **Backend** (Node.js + GEE + Gemini AI)
- ✅ **Frontend** (static files)
- ✅ **Database** (PostgreSQL) for logs
- ✅ **Monitoring** (Uptime Kuma built into Dokploy)
- ✅ **Zero cost** (Oracle Free Tier)

---

## 🏗️ Oracle Cloud Free Tier Specs

| Resource | Free Tier Limit | For FarmHealth |
|----------|----------------|----------------|
| VM (ARM Ampere) | 4 OCPUs, **24GB RAM** (Always Free) | ✅ use all 4 OCPUs / 24GB |
| VM (AMD E2.1.Micro) | 1/8 OCPU, **1GB RAM** (Always Free) | ❌ too small for this stack |
| Block Storage | 200GB total (Always Free) | ✅ 100GB boot volume |
| Bandwidth | 10TB/month (Always Free) | ✅ More than enough |
| **Cost** | **$0/month** | **$0/month** |

**Recommendation**: Use the **ARM (Ampere A1) shape — `VM.Standard.A1.Flex`**.
It's the only Always-Free shape with enough RAM (24GB) for Docker + Ollama.
The AMD free shape (1GB RAM) will OOM — don't use it for this stack.

---

## 🎯 Step-by-Step Setup

### **Phase 1: Create Oracle Cloud Account** (5 min)

1. **Go to**: https://www.oracle.com/cloud/free/
2. Click **"Start for Free"**
3. Sign up with email or GitHub/Google
4. **Add payment method** (required for verification, but you won't be charged if you stay within free tier)
5. Verify identity (credit card verification, $1 temporary hold)
6. Complete signup

**Important**: Set up **billing alerts** at $0 to avoid surprises:
- Go to **Billing** → **Budgets** → **Create Budget**
- Set limit: $0
- Alert threshold: 50%, 90%, 100%

---

### **Phase 2: Create VM Instance** (3 min)

1. **Login** to Oracle Cloud Console: https://cloud.oracle.com
2. Click **☰ Menu** → **Compute** → **Instances**
3. Click **"Create Instance"**

#### **Configuration**:

**Name**: `farmhealth-dokploy`  
**Compartment**: Select your compartment (usually `root`)

**Image**:
- **Canonical Ubuntu** → **22.04** (recommended) or **24.04**

**Shape** (IMPORTANT):
- Click **"Change Shape"**
- Select **"Ampere"** (ARM) or **"VM.Standard.E2.4"** (AMD)
- **OCPUs**: 4
- **Memory**: 24GB (or use all available)

**Networking**:
- **Virtual Cloud Network**: Create new or use existing
- **Subnet**: Public subnet
- **Public IP**: Assign public IPv4 address (REQUIRED)
- **Private IP**: Auto-assign

**SSH Keys**:
- **Option A (Recommended)**: Paste your existing SSH public key (`~/.ssh/id_rsa.pub`)
- **Option B**: Generate new key pair (download private key, save securely)

**Boot Volume**:
- Size: **100GB** (minimum, can increase later)
- Type: **Balanced** (default)

4. Click **"Create**"

**Wait 2-3 minutes** for instance to provision.

---

### **Phase 3: Configure Firewall** (2 min)

⚠️ **Oracle's cloud firewall is separate from the OS firewall** — both must
allow traffic. If the Dokploy dashboard or the app "doesn't load" while
`curl localhost` works on the VM, this is why.

1. In instance details, go to **"Subnet"** → Click VCN
2. Go to **"Security Lists"** → **"Add Ingress Rule"** (add 6 rules):

| Rule | Source | Protocol | Port |
|------|--------|----------|------|
| SSH | 0.0.0.0/0 | TCP | 22 |
| HTTP | 0.0.0.0/0 | TCP | 80 |
| HTTPS | 0.0.0.0/0 | TCP | 443 |
| Dokploy UI | 0.0.0.0/0 | TCP | 3000 |
| FarmHealth app | 0.0.0.0/0 | TCP | 8080 |
| Monitoring | 0.0.0.0/0 | TCP | 3002 |

**Save** all rules.

**Note**: the install script also opens the same ports inside the VM (UFW).
Both layers must agree — if you skip one, you'll get a timeout, not a refused
connection, when connecting from outside.

---

### **Phase 4: SSH into Your VM** (1 min)

```bash
# Replace with your VM's public IP from Oracle Console
ssh ubuntu@YOUR_VM_IP

# Example:
# ssh ubuntu@129.146.123.45
```

**Verify connection**:
```bash
# Should show Ubuntu welcome screen
# Check resources:
free -h  # Should show ~24GB RAM
nproc    # Should show 4 CPUs
df -h    # Should show ~100GB disk
```

---

### **Phase 5: Install Dokploy — ONE script** (5 min)

The repo ships a one-command installer that provisions the box, installs
Dokploy, waits for the UI, and pre-creates the `farmhealth` project:

```bash
# From your laptop — copy the script up, then run it on the VM:
scp scripts/install-dokploy.sh ubuntu@YOUR_VM_IP:/tmp/
ssh ubuntu@YOUR_VM_IP "sudo bash /tmp/install-dokploy.sh"
```

The script (runs on the VM) does:
- `apt` update/upgrade + base packages (retry-aware, won't die on dpkg locks)
- Opens ports 22, 80, 443, 3000, 8080, **3002** via UFW (port 22 failure =
  abort, no SSH lockout) — matching the Oracle Security List below
- Adds 8 GB swap if the box reports < 8 GB RAM
- Runs the official Dokploy installer (Docker, Nginx, LetsEncrypt)
- Waits until the UI answers on `:3000`
- Creates the `farmhealth` project via API when you pass `--api-token`

Equivalent manual install, if you prefer:
```bash
curl -sSL https://dokploy.com/install.sh | sh
```

---

### **Phase 6: Access Dokploy Dashboard** (1 min)

1. Open browser: `http://YOUR_VM_IP:3000`
2. Create admin account:
   - Email: your-email@example.com
   - Password: (strong password)
3. Login

**Dokploy dashboard loads** 🎉

---

### **Phase 7: Deploy the whole stack — one Docker Compose resource** (5 min)

The repo's `docker-compose.dokploy.yml` is the **entire stack in one file** —
no separate frontend/backend split needed. It builds FarmHealth from the
repo's Dockerfile and adds Ollama, PostGIS, and Uptime Kuma:

| Service | Port | Role |
|---|---|---|
| farmhealth | 8080 | App + backend (built from repo) |
| ollama | 11434 | Self-hosted AI (internal) |
| postgis | 5432 | Saved farms / land records |
| uptime-kuma | 3002 | Monitoring (optional) |

1. **Projects → `farmhealth`** (pre-created by the script, or create it)
2. **Add Resource → Docker Compose**
3. Connect GitHub → select `virahitvin8/crafty-gis` (branch `main`)
   **Compose path**: `docker-compose.dokploy.yml`
4. Create → **Deploy** (first build ~5–10 min: Docker image + Ollama model pull)

> **Old two-service split:** earlier guides had you deploy the frontend as a
> static site and the backend as a separate `node:20-alpine` service. You no
> longer need that — one compose resource runs everything, and the Dockerfile
> already bundles the frontend + Node backend in one container.

---

### **Phase 8: Add secrets in the Dokploy dashboard** (2 min)

1. In Dokploy → your compose service → **Environment** tab
2. Add (paste the GEE key as **one line** with its `\n` escapes — the server
   unescapes it, exactly like Render):

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `GEE_SERVICE_ACCOUNT` | `gee-backend-account@braided-analyst-500314-c5.iam.gserviceaccount.com` | GCP IAM |
| `GEE_PRIVATE_KEY` | Single-line PEM with `\n` | GCP service-account key |
| `OLLAMA_MODEL` | `deepseek-r1:7b` (or `deepseek-r1:1.5b` on tight RAM) | — |
| `OLLAMA_VISION_MODEL` | `llava-phi3` (or `llava`) | — |
| `GEMINI_API_KEY` | Your key (optional fallback) | https://aistudio.google.com |
| `SENTINEL_HUB_CLIENT_ID` / `_SECRET` | Optional fallback | https://apps.sentinel-hub.com |
| `POSTGRES_PASSWORD` | Change from default | — |

3. **Save** — no `.env` mounts anywhere (see the compose header: use shell env
   on the laptop, dashboard env on Dokploy).

---

### **Phase 9: Auto-deploy from GitHub (CI/CD)** (2 min)

1. Dokploy → your service → **Settings → Advanced → Deploy Hook** → copy the URL
2. GitHub → repo → **Settings → Secrets and variables → Actions** → add
   `DOKPLOY_DEPLOY_URL` = that URL
3. Push to `main` → `.github/workflows/deploy-dokploy.yml` verifies the build
   and triggers Dokploy automatically.

---

### **Phase 10: Test Your Deployment** (1 min)

```bash
# App + health endpoints (from your computer):
curl http://YOUR_VM_IP:8080/api/health        # backend alive
curl http://YOUR_VM_IP:8080/api/gee/health    # satellite backend
curl http://YOUR_VM_IP:8080/api/ai/health     # Ollama-backed advice
curl -I http://YOUR_VM_IP:8080                # frontend

# Sample API call (real route — NDVI for a field's bounding box):
curl -X POST http://YOUR_VM_IP:8080/api/gee/ndvi \
  -H "Content-Type: application/json" \
  -d '{"bounds":{"west":77.20,"south":28.60,"east":77.22,"north":28.62},"date":"2024-01-15"}'
```

---

## 🔒 Security Hardening (Optional but Recommended)

### **1. Change SSH Port**

```bash
ssh ubuntu@YOUR_VM_IP

# Edit SSH config:
sudo nano /etc/ssh/sshd_config

# Change:
Port 22 → Port 2222 (or any port 1024-65535)

# Restart SSH:
sudo systemctl restart sshd

# Update firewall:
sudo ufw allow 2222/tcp
sudo ufw deny 22/tcp
```

### **2. Enable UFW Firewall**

```bash
sudo ufw enable
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3000/tcp # Dokploy dashboard (optional, restrict to your IP)
sudo ufw allow 2222/tcp # SSH (if changed)
```

### **3. Disable Root Login**

```bash
sudo nano /etc/ssh/sshd_config

# Set:
PermitRootLogin no

# Restart:
sudo systemctl restart sshd
```

---

## 📊 Monitoring & Maintenance

### **Check Status**

```bash
# SSH into VM
ssh ubuntu@YOUR_VM_IP

# Check stack (Dokploy's compose resource creates its own project containers):
docker ps | grep -E 'dokploy|farmhealth|ollama|uptime'

# Check the farmhealth service logs:
docker ps --format '{{.Names}}' | grep -i farmhealth | xargs -I{} docker logs {} -f
```

### **Update FarmHealth**

Push to `main` → GitHub Actions (`.github/workflows/deploy-dokploy.yml`)
auto-triggers Dokploy. Manual trigger:
1. Dokploy Dashboard → `farmhealth` project → the compose service
2. Click **"Redeploy"**

### **Backup**

Dokploy auto-backups to:
- `/var/lib/dokploy` (configurations)
- Docker volumes (databases)

**Oracle Cloud** also has automated backups for the boot volume.

---

## 🛠️ Troubleshooting

### **Issue: Dokploy not accessible**

```bash
# Is Dokploy up on the VM itself?
docker ps | grep dokploy
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000   # should be 200/302

# VM is fine but your browser times out?
# → Oracle Security List rule for TCP 3000 is missing (Phase 3), or UFW blocks it.
sudo ufw status
```

### **Issue: App / API not reachable from outside**

```bash
# Works on the VM but times out externally? Same two-layer firewall story:
curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/health
# → add TCP 8080 to the Oracle Security List AND open it in UFW.
```

### **Issue: Service keeps restarting / OOM**

```bash
# 4GB RAM with default models can OOM. Either:
#  - set OLLAMA_MODEL=deepseek-r1:1.5b + OLLAMA_VISION_MODEL=llava (small)
#  - or add swap:  sudo fallocate -l 8G /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
```

### **Issue: HTTPS not working**

```bash
# Ensure ports 80/443 are open in the Oracle Security List AND UFW,
# and the domain's A record points at YOUR_VM_IP.
```

### **Issue: HTTPS not working**

```bash
# Check Nginx:
docker logs nginx-proxy -f

# Ensure ports 80/443 are open in Oracle firewall
```

---

## 💰 Cost Breakdown

| Resource | Oracle Free Tier | Your Cost |
|----------|-----------------|----------|
| VM (ARM, 4 cores, 24GB RAM) | 4 OCPUs, 24GB RAM | **$0** |
| Block Storage (100GB) | 2x 200GB volumes | **$0** |
| Bandwidth | 10TB/month | **$0** |
| **Total** | | **$0/month** |

**⚠️ Stay within free tier**:
- Don't create more than 2 compute instances
- Don't exceed 200GB total storage
- Don't exceed 10TB/month egress

**Monitor**: https://cloud.oracle.com/usage

---

## 🚀 Advanced: Custom Domain with SSL

1. **Buy domain** (Namecheap, Google Domains, etc.)
2. **Point DNS** to your Oracle VM IP:
   - A record: `@` → `YOUR_VM_IP`
   - CNAME: `www` → `@`
3. **In Dokploy**:
   - Go to `farmhealth` → **Domains**
   - Add: `yourdomain.com`
   - Dokploy auto-generates SSL certificate
4. **Done**: `https://yourdomain.com` now live

---

## 📋 Post-Deployment Checklist

- [ ] Oracle Cloud account created
- [ ] ARM (Ampere A1) instance created — 4 OCPUs / 24GB (not the 1GB AMD shape)
- [ ] Cloud firewall: TCP 22, 80, 443, **3000, 8080, 3002** in Security List
- [ ] SSH access working
- [ ] `scripts/install-dokploy.sh` run (or manual Dokploy install)
- [ ] Dokploy dashboard accessible (`:3000`)
- [ ] `docker-compose.dokploy.yml` deployed as one compose resource
- [ ] Secrets added in Dokploy env tab (GEE key as single line, models, postgres pw)
- [ ] Health checks passing: `/api/health`, `/api/gee/health`, `/api/ai/health`
- [ ] GitHub Actions `DOKPLOY_DEPLOY_URL` secret set (auto-deploy on push)
- [ ] HTTPS working (via LetsEncrypt)
- [ ] Custom domain configured (optional)
- [ ] Billing alerts set ($0 limit)

---

## 🎯 You're Done!

Your FarmHealth instance is now:
- ✅ **24/7 online** (Oracle Free Tier)
- ✅ **Auto-deploying** from GitHub (via Dokploy)
- ✅ **HTTPS enabled** (LetsEncrypt)
- ✅ **Always-on** (no sleeping like Render)
- ✅ **Zero cost** (staying within free tier)

**Access your app**: `http://YOUR_VM_IP` or `https://your-custom-domain.com`

**Access Dokploy**: `http://YOUR_VM_IP:3000`

---

## 📚 Additional Resources

- **Oracle Cloud Docs**: https://docs.oracle.com/en-us/iaas/Content/home.htm
- **Oracle Always Free FAQ**: https://www.oracle.com/cloud/free/faq.html
- **Dokploy Docs**: https://dokploy.com/docs
- **FarmHealth GitHub**: https://github.com/virahitvin8/crafty-gis
- Sibling guides: `DOKPLOY_DEPLOY.md` (general), `SELFHOST_MIGRATION.md` (laptop)

---

## 🆘 Need Help?

1. Check **DEPLOY_NOW.md** for alternative deployment methods
2. Check **DOKPLOY_DEPLOY.md** for Dokploy-specific issues
3. Open an issue: https://github.com/virahitvin8/crafty-gis/issues

---

**Happy farming! 🌾🚀**
