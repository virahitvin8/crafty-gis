#!/bin/bash

# ============================================
# Crafty GIS Deployment Script
# Pushes to Git → Triggers Render + Netlify
# ============================================

set -e  # Exit on error

echo "🚀 Deploying Crafty GIS..."

echo "\n📝 Step 1: Checking Git status..."
git status --short

echo "\n➕ Step 2: Adding all changes..."
git add -A

echo "\n💬 Step 3: Enter commit message (or press Enter for default):"
read -r COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo "\n📦 Step 4: Committing changes..."
git commit -m "$COMMIT_MSG"

echo "\n☁️  Step 5: Pushing to GitHub..."
git push origin main

echo "\n✅ Deployment triggered!"
echo "\n📊 Check status:"
echo "  - GitHub: https://github.com/virahitvin8/crafty-gis"
echo "  - Render: https://dashboard.render.com"
echo "  - Netlify: https://app.netlify.com"
echo "\n⏳ Auto-deployment will start in 1-2 minutes..."
echo "   Render takes ~3 minutes to deploy"
echo "   Netlify takes ~2 minutes to deploy"
