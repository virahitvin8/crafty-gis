# FarmHealth Self-Hosted Deployment Guide

## Architecture Overview

```
Your Server/VPS
├── FarmHealth (Node.js backend)  Port 3001
├── Ollama (DeepSeek + LLaVA)     Port 11434
└── Uptime Kuma (Monitoring)       Port 3002
```

## Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- 8GB+ RAM (16GB recommended)
- 20GB+ disk space

### 2. Setup

```bash
git clone <your-repo>
cd "AGRI APP"
cp .env.example .env

docker-compose up -d

# Pull AI models (first time only)
docker-compose exec ollama ollama pull deepseek-r1:7b
docker-compose exec ollama ollama pull llava-phi3
```

### 3. Access
Open http://localhost:3001

## Coolify/Dokploy Deployment

### Coolify
1. Push to GitHub
2. New Resource → Docker Compose
3. Paste docker-compose.yml
4. Deploy

### Dokploy
1. Applications → Create
2. Select Docker Compose
3. Upload docker-compose.yml
4. Set domain & port 3001
5. Deploy

## Ollama AI Models

### Text Model (AI Advisory)
```bash
ollama pull deepseek-r1:7b                # ~4.7GB, recommended (R1-Distill-Qwen-7B)
ollama pull mistral:7b                    # ~4.4GB, alternative
```

### Vision Model (Crop Photo Analysis)
```bash
ollama pull llava-phi3      # ~2.9GB, recommended for 8GB CPU boxes
ollama pull moondream       # ~1.7GB, ultra-light
ollama pull llava:13b       # ~8GB, best quality — only on 16GB+ RAM machines
```

## Monitoring

```bash
# Deploy Uptime Kuma
docker run -d -p 3002:3002 -v uptime-kuma:/app/data \
  --name uptime-kuma --restart unless-stopped louislam/uptime-kuma:1

# Add monitors:
# - FarmHealth Backend: http://localhost:3001/api/health
# - Ollama AI: http://localhost:3001/api/ai/health
# - GEE: http://localhost:3001/api/gee/health
```

## Authentik Setup (Replace Firebase)

```bash
# Deploy Authentik
mkdir -p authentik && cd authentik
curl -O https://goauthentik.io/docker-compose.yml
docker compose up -d

# Configure at https://your-domain:9443
# Create OAuth2 app for FarmHealth
```

## Cost Estimate

| Component | Cost/Month |
|-----------|------------|
| VPS (4GB RAM) | $5-10 |
| Fly.io | $0 (free tier) |
| Oracle Cloud | $0 (always free) |
| Ollama + AI | $0 |
| **Total** | **$0-10** |

## Commands

```bash
docker-compose up -d          # Start
docker-compose down           # Stop
docker-compose restart        # Restart
docker-compose logs -f        # Logs

git pull && docker-compose up -d --build  # Update
```
