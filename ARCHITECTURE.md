# 🏗️ FarmHealth Architecture — Primary vs Secondary

## Overview

FarmHealth uses a **Primary → Secondary** fallback architecture:
- **Primary (✅):** Open-source, self-hosted, free, recommended
- **Secondary (⚠️):** Legacy/optional, still supported for backward compatibility

---

## 🔐 Authentication

| Priority | Method | Type | Status |
|----------|--------|------|--------|
| ✅ **PRIMARY** | **authentik** | Self-hosted OIDC | **Recommended** |
| ⚠️ **SECONDARY** | **Firebase Auth** | Google OAuth | Legacy fallback |

### Flow
```
User clicks Login
    ↓
Is authentik configured?
    ├─ YES → Show authentik button (PRIMARY)
    │        ↓
    │       User logs in via authentik
    │        ↓
    │       Success ✅
    │
    └─ NO → Show Google Sign-In (SECONDARY)
             ↓
            Firebase Auth
             ↓
            Success ✅
```

### authentik Setup (PRIMARY)
```bash
# Deploy authentik
docker compose -f authentik/docker-compose.yml up -d

# Configure in FarmHealth
localStorage.setItem('fh_authentik_issuer', 'https://your-authentik-domain:9443');
localStorage.setItem('fh_authentik_client_id', 'farmhealth');
```

### Firebase Setup (SECONDARY)
- Automatically used if authentik not configured
- No changes needed, works out of the box

---

## 🤖 AI Advisory System

| Priority | Method | Type | Status |
|----------|--------|------|--------|
| ✅ **PRIMARY** | **Ollama + DeepSeek** | Self-hosted LLM | **Active** |
| ⚠️ **SECONDARY** | **Gemini API** | Cloud API | Optional fallback |
| ✅ **FALLBACK** | **Built-in Expert** | JavaScript | Always works |

### Flow
```
User requests AI advice
    ↓
Try Ollama (localhost:11434)
    ├─ SUCCESS → Return DeepSeek advice ✅
    │
    └─ FAIL → Try Gemini API
              ├─ SUCCESS → Return Gemini advice ✅
              │
              └─ FAIL → Return built-in expert advice ✅
```

### Configuration
```bash
# .env - Primary (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1-distill-qwen-7b

# .env - Secondary (Gemini, optional)
# GEMINI_API_KEY=your_key_here
```

---

## 📷 Image Analysis (Crop Photo Diagnosis)

| Priority | Method | Type | Status |
|----------|--------|------|--------|
| ✅ **PRIMARY** | **LLaVA Vision Model** | Self-hosted Vision AI | **Active** |
| ⚠️ **SECONDARY** | None | - | New feature |

### Flow
```
User uploads crop photo
    ↓
Convert to base64
    ↓
Send to Ollama LLaVA model
    ↓
Analyze image (30-60s on CPU)
    ↓
Return JSON: disease, severity, recommendations
```

### Models
```bash
# Primary: Best quality (8GB RAM)
ollama pull llava:13b

# Alternative: Faster on CPU (3GB RAM)
ollama pull llava-phi3

# Ultra-light: Minimum resources (2GB RAM)
ollama pull moondream
```

---

## 📡 Satellite Data Sources

| Priority | Method | Type | Status |
|----------|--------|------|--------|
| ✅ **PRIMARY** | **Google Earth Engine** | Free, unlimited | **Active** |
| ⚠️ **SECONDARY** | **Sentinel Hub** | Freemium | Optional |
| ✅ **ALTERNATIVE** | **Open Data Cube + STAC** | Self-hosted | Optional |

### Flow
```
User requests satellite data
    ↓
Try Google Earth Engine (GEE)
    ├─ SUCCESS → Return GEE data ✅
    │
    └─ FAIL → Try Sentinel Hub
              ├─ SUCCESS → Return Sentinel Hub data ✅
              │
              └─ FAIL → Try STAC API / Open Data Cube
                        ├─ SUCCESS → Return STAC data ✅
                        │
                        └─ FAIL → Return simulated data ✅
```

### Configuration
```bash
# Primary: Google Earth Engine (free, no limits)
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----

# Secondary: Sentinel Hub (optional)
# SENTINEL_HUB_CLIENT_ID=your_id
# SENTINEL_HUB_CLIENT_SECRET=your_secret

# Alternative: Open Data Cube
# ODC_API_URL=http://localhost:8000
```

---

## 🏗️ Hosting & Infrastructure

| Priority | Method | Type | Status |
|----------|--------|------|--------|
| ✅ **PRIMARY** | **Coolify / Dokploy** | Self-hosted PaaS | **Recommended** |
| ⚠️ **SECONDARY** | **Render** | Cloud PaaS | Legacy (sleeps) |
| ✅ **ALTERNATIVE** | **Fly.io / Oracle Cloud** | Cloud VPS | Always-on |

### Flow
```
Deploy FarmHealth
    ↓
Use Coolify/Dokploy (PRIMARY)
    ├─ SUCCESS → Deployed ✅
    │
    └─ FAIL → Use Fly.io/Oracle (ALTERNATIVE)
              ├─ SUCCESS → Deployed ✅
              │
              └─ FAIL → Use Render (SECONDARY)
                        └─ Deployed (but sleeps) ⚠️
```

---

## 📊 Monitoring

| Priority | Method | Type | Status |
|----------|--------|------|--------|
| ✅ **PRIMARY** | **Uptime Kuma** | Self-hosted | **Recommended** |
| ⚠️ **SECONDARY** | Manual checks | - | Fallback |

### Setup
```bash
docker run -d -p 3001:3001 -v uptime-kuma:/app/data \
  --name uptime-kuma --restart unless-stopped louislam/uptime-kuma:1

# Add monitors:
# - FarmHealth Backend: http://localhost:3001/api/health
# - Ollama AI: http://localhost:3001/api/ai/health
# - GEE: http://localhost:3001/api/gee/health
```

---

## 🎯 Summary: What's Primary vs Secondary

| Component | PRIMARY (Use This) | SECONDARY (Fallback) |
|-----------|-------------------|---------------------|
| **Authentication** | authentik (self-hosted OIDC) | Firebase Auth (Google) |
| **AI Advisory** | Ollama + DeepSeek (local LLM) | Gemini API (cloud) |
| **Image Analysis** | LLaVA vision model | None (new feature) |
| **Satellite Data** | Google Earth Engine | Sentinel Hub |
| **Hosting** | Coolify/Dokploy | Render |
| **Monitoring** | Uptime Kuma | Manual checks |

---

## 💡 Migration Guide

### From Old Stack to New Stack

**Authentication:**
```bash
# Old: Firebase (PRIMARY)
Firebase Auth → Google Sign-In

# New: authentik (PRIMARY)
Docker Compose → OIDC → Self-hosted

# Migration: Deploy authentik, configure redirect URI, done
```

**AI Advisory:**
```bash
# Old: Gemini API (PRIMARY)
Gemini API → Cloud → Paid after limits

# New: Ollama (PRIMARY)
Ollama → Local → Free forever

# Migration: Install Ollama, pull models, update .env, done
```

**Satellite Data:**
```bash
# Old: Sentinel Hub (PRIMARY)
Sentinel Hub → Paid API → Rate limits

# New: Google Earth Engine (PRIMARY)
GEE → Free → Unlimited

# Migration: Add GEE credentials to .env, done
```

---

## 🎉 Benefits of Primary → Secondary Architecture

1. **Zero vendor lock-in** — Everything open-source
2. **Cost savings** — $0-10/month vs $50-100/month
3. **24×7 operation** — No sleeping backends, no rate limits
4. **Backward compatible** — Old services still work
5. **Gradual migration** — Switch at your own pace
6. **Offline capable** — Works without internet (with Ollama)
7. **Privacy** — Data stays on your server

---

## 📚 Reference

- **authentik:** https://goauthentik.io
- **Ollama:** https://ollama.ai
- **Google Earth Engine:** https://earthengine.google.com
- **Coolify:** https://coolify.io
- **Uptime Kuma:** https://github.com/louislam/uptime-kuma
