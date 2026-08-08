#!/bin/bash
# ═══════════════════════════════════════════════════════════
# FarmHealth — Web Build Script
# Builds the www/ folder for web deployment (Netlify, Vercel, etc.)
# ═══════════════════════════════════════════════════════════

set -e

echo ""
echo "  🛰️  FarmHealth — Web Build"
echo "  ─────────────────────────────"
echo ""

BUILD_DIR="www"

# Clean and recreate build directory
echo "🧹 Cleaning build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# ─── Copy Frontend Files ───
echo "📦 Copying frontend files..."
cp index.html "$BUILD_DIR/"
cp manifest.json "$BUILD_DIR/"
cp sw.js "$BUILD_DIR/"
cp -r css "$BUILD_DIR/css"
cp -r js "$BUILD_DIR/js"
cp -r assets "$BUILD_DIR/" 2>/dev/null || true
cp -r farmhealth_dashboard "$BUILD_DIR/" 2>/dev/null || true
cp -r farmhealth_precision "$BUILD_DIR/" 2>/dev/null || true
cp -r field_analytics_ai_advice "$BUILD_DIR/" 2>/dev/null || true
cp -r learning_module "$BUILD_DIR/" 2>/dev/null || true
cp -r my_fields "$BUILD_DIR/" 2>/dev/null || true

# Copy server files for deployment
cp -r server "$BUILD_DIR/server"
cp package.json "$BUILD_DIR/"
cp package-lock.json "$BUILD_DIR/" 2>/dev/null || true

# Copy deployment files
cp Dockerfile "$BUILD_DIR/"
cp docker-compose.yml "$BUILD_DIR/" 2>/dev/null || true
cp netlify.toml "$BUILD_DIR/"
cp render.yaml "$BUILD_DIR/"
cp .env.example "$BUILD_DIR/"
cp deploy-gcr.sh "$BUILD_DIR/" 2>/dev/null || true

# Copy documentation
cp README.md "$BUILD_DIR/" 2>/dev/null || true
cp FARMHEALTH_VISION.md "$BUILD_DIR/" 2>/dev/null || true
cp DEPLOY.md "$BUILD_DIR/" 2>/dev/null || true
cp LICENSE "$BUILD_DIR/" 2>/dev/null || true

# Create logs directory
mkdir -p "$BUILD_DIR/logs"

# Get file sizes
echo ""
echo "  ✅ Build complete!"
echo "  ─────────────────────────────"
echo "  📂 www/ contents:"
echo "     index.html: $(wc -c < "$BUILD_DIR/index.html") bytes"
echo "     css/: $(find "$BUILD_DIR/css" -type f | wc -l) files"
echo "     js/: $(find "$BUILD_DIR/js" -type f | wc -l) files"
echo "     server/: $(find "$BUILD_DIR/server" -type f -name "*.js" | wc -l) JS files"
echo ""
echo "  🚀 Ready for deployment!"
echo "     • Netlify: Upload www/ folder"
echo "     • Render: Push to GitHub"
echo "     • Docker: docker build -t farmhealth ."
echo "     • Local:  cd www && npm start"
echo ""
