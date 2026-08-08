<#
.SYNOPSIS
  Deploy FarmHealth to Google Cloud Run for 24/7 access.
.DESCRIPTION
  This script:
    1. Checks prerequisites (gcloud, docker)
    2. Builds the Docker image
    3. Pushes to Google Container Registry
    4. Deploys to Cloud Run
    5. Outputs the public URL

  Prerequisites:
    - Google Cloud SDK installed (gcloud CLI)
    - Docker Desktop installed
    - You are logged in: gcloud auth login
    - You have a Google Cloud project with billing enabled
    - Run: gcloud auth configure-docker

.NOTES
  Author: FarmHealth
  Version: 1.0
#>

param(
  [string]$ProjectId = "",
  [string]$Region = "us-central1",
  [string]$ServiceName = "farmhealth",
  [switch]$SkipBuild
)

Write-Host ""
Write-Host "  🛰️  FarmHealth — Google Cloud Deploy" -ForegroundColor Green
Write-Host "  ─────────────────────────────────────" -ForegroundColor Green
Write-Host ""

# ─── 1. Check Prerequisites ───
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check gcloud
try {
  $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
  Write-Host "  ✅ gcloud: $gcloudVersion" -ForegroundColor Green
} catch {
  Write-Host "  ❌ Google Cloud SDK not found. Install from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
  exit 1
}

# Check docker
try {
  $dockerVersion = docker --version 2>&1
  Write-Host "  ✅ Docker: $dockerVersion" -ForegroundColor Green
} catch {
  Write-Host "  ❌ Docker not found. Install from: https://docker.com" -ForegroundColor Red
  exit 1
}

# ─── 2. Get Project ID ───
if (-not $ProjectId) {
  $ProjectId = gcloud config get-value project 2>$null
  if (-not $ProjectId) {
    Write-Host "  ❌ Could not determine Google Cloud project ID." -ForegroundColor Red
    Write-Host "     Either set it via -ProjectId flag or run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
    exit 1
  }
}

Write-Host "  ✅ Project: $ProjectId" -ForegroundColor Green
Write-Host "  ✅ Region:  $Region" -ForegroundColor Green
Write-Host "  ✅ Service: $ServiceName" -ForegroundColor Green
Write-Host ""

# ─── 3. Build & Deploy ───
$imageTag = "gcr.io/$ProjectId/$ServiceName`:latest"
$cloudRunUrl = "https://$ServiceName-4c6meg2mzq-$Region.a.run.app"

if (-not $SkipBuild) {
  Write-Host "🔨 Building Docker image..." -ForegroundColor Yellow
  docker build . -t $imageTag
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Docker build failed!" -ForegroundColor Red
    exit 1
  }
  Write-Host "  ✅ Image built: $imageTag" -ForegroundColor Green
  Write-Host ""

  Write-Host "📤 Pushing to Google Container Registry..." -ForegroundColor Yellow
  docker push $imageTag
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Push failed! Did you run 'gcloud auth configure-docker'?" -ForegroundColor Red
    exit 1
  }
  Write-Host "  ✅ Image pushed!" -ForegroundColor Green
  Write-Host ""
}

Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
  --image $imageTag `
  --platform managed `
  --region $Region `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --concurrency 80 `
  --min-instances 0 `
  --max-instances 2 `
  --timeout 300 `
  --set-env-vars "NODE_ENV=production"

if ($LASTEXITCODE -ne 0) {
  Write-Host "  ❌ Deploy failed!" -ForegroundColor Red
  exit 1
}

# ─── 4. Output URL ───
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║" -ForegroundColor Green -NoNewline; Write-Host "  🛰️  FarmHealth is now live 24/7! 🎉  " -ForegroundColor White -NoNewline; Write-Host " ║" -ForegroundColor Green
Write-Host "  ╠══════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║" -ForegroundColor Green -NoNewline; Write-Host "  🌐  URL: $cloudRunUrl               " -ForegroundColor Cyan -NoNewline; Write-Host " ║" -ForegroundColor Green
Write-Host "  ╠══════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║" -ForegroundColor Green -NoNewline; Write-Host "  📡  GEE API: $cloudRunUrl/api/gee  " -ForegroundColor Cyan -NoNewline; Write-Host " ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Quick Commands:" -ForegroundColor Yellow
Write-Host "  Open in browser: start $cloudRunUrl" -ForegroundColor Gray
Write-Host "  View logs:       gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=$ServiceName' --limit 10" -ForegroundColor Gray
Write-Host "  Check health:    curl $cloudRunUrl/api/gee/health" -ForegroundColor Gray
Write-Host ""
