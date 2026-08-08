#!/bin/bash
# ═══════════════════════════════════════════════════════════
# FarmHealth — Google Cloud Run Deployment Script
# ═══════════════════════════════════════════════════════════
set -e

echo ""
echo "  🛰️  FarmHealth — Google Cloud Run Deployment"
echo "  ──────────────────────────────────────────────"
echo ""

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-farmhealth-$(date +%s)}"
SERVICE_NAME="farmhealth"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "   Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Authenticate
echo "🔐 Authenticating with Google Cloud..."
gcloud auth login

# Set project
echo "📋 Setting project: ${PROJECT_ID}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com

# Build and submit to Cloud Build
echo "🏗️  Building container image..."
gcloud builds submit --tag ${IMAGE_NAME}

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300s \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,PORT=8080

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

echo ""
echo "  ✅ Deployment successful!"
echo "  ──────────────────────────────────────────────"
echo "  🌐 Service URL: ${SERVICE_URL}"
echo "  📊 Health Check: ${SERVICE_URL}/api/gee/health"
echo "  🔧 Management: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}"
echo ""
