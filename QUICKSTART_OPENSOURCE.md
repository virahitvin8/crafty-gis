# 🚀 Quick Start — 100% Open-Source FarmHealth

## 5-Minute Setup

### Prerequisites
- Docker & Docker Compose installed
- 8GB+ RAM

### Step 1: Start Services
```bash
cd "AGRI APP"
docker-compose up -d
```

### Step 2: Pull AI Models (First Time Only)
```bash
docker-compose exec ollama ollama pull deepseek-r1:7b
docker-compose exec ollama ollama pull llava-phi3
```

**⏱️ This takes 10-20 minutes** (models are ~4.7GB + ~2.9GB)

### Step 3: Access the App
```
Open: http://localhost:3001
```

## ✨ Features Now Available

1. **🤖 AI Agronomist** — Click "Get AI Analysis"
   - Uses DeepSeek LLM (self-hosted)
   - No API key needed!
   - Falls back to expert system if offline

2. **📷 Crop Photo Diagnosis** — Upload a crop photo
   - Uses LLaVA vision AI
   - Detects diseases, pests, stress
   - Returns structured JSON with recommendations

3. **📊 Satellite Analysis** — Draw field on map
   - NDVI, EVI, NDMI, NDWI, etc.
   - Uses Google Earth Engine (free)

4. **🌤️ Weather + Soil** — Auto-fetched
   - Open-Meteo (free)
   - SoilGrids (free)

## 🔧 Useful Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop
docker-compose down

# Update models
docker-compose exec ollama ollama pull <model-name>

# Check AI health
curl http://localhost:3001/api/ai/health
```

## 📊 Cost Breakdown

| What | Cost |
|------|------|
| VPS (4GB RAM) | $5-10/month |
| Fly.io | $0 (free tier) |
| Oracle Cloud | $0 (always free) |
| AI Models | $0 |
| **Total** | **$0-10/month** |

**vs. Old stack:** $50-100/month with Gemini + Render + Sentinel Hub

## 🆘 Troubleshooting

**Ollama not responding?**
```bash
docker-compose logs ollama
```

**Out of memory?**
```bash
# Use lighter model
docker-compose exec ollama ollama pull llava-phi3
# Update .env: OLLAMA_VISION_MODEL=llava-phi3
```

**Vision analysis slow?**
- First call loads model into RAM (~30s)
- Subsequent calls are fast (~5-10s)
- Use GPU for 10-50x speedup

## 📚 Full Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — Complete deployment guide
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) — Technical details
- [README.md](README.md) — Project overview

## 🎯 What Changed

### Before
- ❌ Gemini API (paid, rate limits)
- ❌ Render backend (sleeps)
- ❌ No image analysis
- ❌ $50-100/month

### After
- ✅ Ollama + DeepSeek (free, self-hosted)
- ✅ LLaVA vision AI (free, self-hosted)
- ✅ Docker Compose (24×7 operation)
- ✅ $0-10/month

## 🚀 Deploy to Production

### Coolify (Recommended)
1. Push to GitHub
2. Coolify → New → Docker Compose
3. Paste `docker-compose.yml`
4. Deploy!

### Fly.io
```bash
fly launch
fly secrets set OLLAMA_BASE_URL=http://ollama:11434
fly deploy
```

### Oracle Cloud (Always Free)
- 4 ARM VMs, 24GB RAM total
- Deploy Docker Compose
- Zero cost forever
