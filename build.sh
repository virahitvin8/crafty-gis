#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  FarmHealth — Web-only Build Script (Netlify / Vercel / CI)
#  Copies ONLY the frontend files into www/ — no Android sync.
#  ═══════════════════════════════════════════════════════════

set -e

echo ""
echo "  🛰️  FarmHealth — Web Build"
echo "  ───────────────────────────"

BUILD_DIR="www"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "📦 Copying frontend files..."
cp index.html "$BUILD_DIR/"
cp manifest.json "$BUILD_DIR/"
cp sw.js "$BUILD_DIR/"
cp -r css "$BUILD_DIR/css"
cp -r js "$BUILD_DIR/js"
cp -r assets "$BUILD_DIR/" 2>/dev/null || true

echo "  ✅ www/ built: $(ls www/index.html 2>/dev/null | wc -l) files"
echo "  ✅ Build complete!"
