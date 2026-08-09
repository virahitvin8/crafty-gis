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
| VM (AMD) | 4 cores, 24GB RAM | ✅ Use 4 cores, 4GB RAM |
| VM (ARM) | 4 cores, 24GB RAM | ✅ Use 4 cores, 4GB RAM (ARM) |
| Block Storage | 2x 200GB volumes | ✅ Use 100GB for app + data |
| Bandwidth | 10TB/month | ✅ More than enough |
| **Cost** | **$0/month** | **$0/month** |

**Recommendation**: Use **ARM-based VM** (4 cores, 24GB RAM) — better performance, lower cost.

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

1. In instance details, go to **"Subnet"** → Click VCN
2. Go to **"Security Lists**"
3. Click **"Add Ingress Rule"** (add 3 rules):

| Rule | Source | Protocol | Port |
|------|--------|----------|------|
| SSH | 0.0.0.0/0 | TCP | 22 |
| HTTP | 0.0.0.0/0 | TCP | 80 |
| HTTPS | 0.0.0.0/0 | TCP | 443 |

**Save** all rules.

**Note**: Dokploy will auto-configure internal firewall rules on first run.

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

### **Phase 5: Install Dokploy** (5 min)

**Run this ONE command** (official installer):

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

**What it does** (takes ~3-5 minutes):
- Installs Docker Engine
- Installs Docker Compose
- Creates `dokploy` user
- Deploys Dokploy on ports 3000, 80, 443
- Sets up Nginx reverse proxy
- Configures firewall (UFW)

**Wait for completion**. You'll see:
```
✅ Dokploy installed successfully!
🌐 Access at: http://YOUR_VM_IP:3000
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

### **Phase 7: Deploy FarmHealth** (5 min)

#### **7.1: Add GitHub Connection**

1. Click **"Settings"** (⚙️ icon)
2. Go to **"Git Providers**"
3. Click **"GitHub"**
4. Click **"Connect GitHub"**
5. Authorize Dokploy to access your repos
6. Select: **`virahitvin8/crafty-gis`**

#### **7.2: Create New Project**

1. Click **"Projects"** → **"New Project"**
2. Name: `farmhealth`
3. Click **"Create"**

#### **7.3: Deploy Application**

1. In `farmhealth` project, click **"Add New"**
2. Select **"Git Repository"**
3. Fill in:
   - **Repository**: `virahitvin8/crafty-gis`
   - **Branch**: `main`
   - **Build Command** (if any): Leave empty (static site)
   - **Publish Directory**: `.` (root)
4. Click **"Deploy"**

**Dokploy will**:
- Clone your repo
- Build static files (if needed)
- Deploy to Nginx on port 80
- Auto-configure HTTPS via LetsEncrypt

**Wait 2-3 minutes** for deployment.

---

### **Phase 8: Configure Backend** (3 min)

Dokploy deploys the frontend, but you also need the **Node.js backend** running.

#### **Option A: Deploy Backend as Separate Service** (Recommended)

1. In `farmhealth` project, click **"Add New"**
2. Select **"Docker Compose"**
3. Name: `farmhealth-backend`
4. Paste this `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./server:/app/server
      - ./js:/app/js
      - ./package.json:/app/package.json
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      # Add your secrets here (or use Dokploy Secrets Manager)
      - SENTINEL_HUB_CLIENT_ID=${SENTINEL_HUB_CLIENT_ID}
      - SENTINEL_HUB_CLIENT_SECRET=${SENTINEL_HUB_CLIENT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEE_SERVICE_ACCOUNT=${GEE_SERVICE_ACCOUNT}
      - GEE_PRIVATE_KEY=${GEE_PRIVATE_KEY}
      - OLLAMA_URL=http://ollama:11434
    command: sh -c "cd /app/server && npm install && node server.js"
    restart: always
    networks:
      - farmhealth-net

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: always
    networks:
      - farmhealth-net

volumes:
  ollama_data:

networks:
  farmhealth-net:
    driver: bridge
```

5. Click **"Deploy**"
6. Wait for backend to start

#### **Option B: Use Render for Backend** (Easier)

If Dokploy backend is complex, just use **Render** (free tier, sleeps after 15min):

```bash
# Follow instructions in DEPLOY_NOW.md for Render
# Frontend stays on Dokploy (always-on)
# Backend sleeps on Render (wakes on request)
```

---

### **Phase 9: Configure Environment Variables** (2 min)

In Dokploy:

1. Go to **farmhealth** project → **farmhealth-backend** service
2. Click **"Environment Variables**"
3. Add these secrets:

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `SENTINEL_HUB_CLIENT_ID` | Your ID | https://apps.sentinel-hub.com |
| `SENTINEL_HUB_CLIENT_SECRET` | Your secret | https://apps.sentinel-hub.com |
| `GEMINI_API_KEY` | Your key | https://aistudio.google.com |
| `GEE_SERVICE_ACCOUNT` | Your email | Google Cloud Console |
| `GEE_PRIVATE_KEY` | Your JSON key | Download from GCP |

4. Click **"Save**"
5. **Restart** the backend service

---

### **Phase 10: Test Your Deployment** (1 min)

```bash
# Test frontend (from your computer):
curl https://your-custom-domain.com
# OR
curl http://YOUR_VM_IP

# Test backend health:
curl http://YOUR_VM_IP:3001/api/health

# Test API:
curl -X POST http://YOUR_VM_IP:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"lat": 28.6139, "lon": 77.2090}'
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

# Check Dokploy:
docker ps | grep dokploy

# Check backend:
docker ps | grep farmhealth

# Check logs:
docker logs farmhealth-backend -f
```

### **Update FarmHealth**

When you push to GitHub, Dokploy **auto-deploys** (if configured).

Manual trigger:
1. Dokploy Dashboard → `farmhealth` project
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
# Check if Dokploy is running:
docker ps | grep dokploy

# Check logs:
docker logs dokploy -f

# Check ports:
sudo netstat -tlnp | grep 3000
```

### **Issue: Backend not starting**

```bash
# Check backend logs:
docker logs farmhealth-backend -f

# Common issues:
# - Missing environment variables → Add in Dokploy
# - Port conflict → Change port in docker-compose
# - Memory limit → Increase in Dokploy settings
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
- [ ] VM instance created (ARM or AMD)
- [ ] Firewall rules configured (22, 80, 443)
- [ ] SSH access working
- [ ] Dokploy installed
- [ ] Dokploy dashboard accessible
- [ ] FarmHealth frontend deployed
- [ ] Backend service deployed (or Render connected)
- [ ] Environment variables configured
- [ ] Health check passing (`/api/health`)
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
- **Dokploy Docs**: https://dokploy.com/docs
- **FarmHealth GitHub**: https://github.com/virahitvin8/crafty-gis
- **Oracle Free Tier FAQ**: https://www.oracle.com/cloud/free/faq.html

---

## 🆘 Need Help?

1. Check **DEPLOY_NOW.md** for alternative deployment methods
2. Check **DOKPLOY_DEPLOY.md** for Dokploy-specific issues
3. Open an issue: https://github.com/virahitvin8/crafty-gis/issues

---

**Happy farming! 🌾🚀**
