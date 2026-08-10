#!/bin/bash

# ============================================================
# 🛰️ Crafty GIS — Startup Script
# Agricultural Geospatial Intelligence Platform
# ============================================================

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🛰️  Crafty GIS — Agricultural Geospatial Intelligence      ║"
echo "║  AI-Powered Precision Agriculture Platform                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================================
# 1. Start Backend Server
# ============================================================
echo -e "${BLUE}📦 Starting Backend Server...${NC}"

cd "$SCRIPT_DIR/crafty-gis-server"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Installing backend dependencies...${NC}"
    pip install -r requirements.txt -q
fi

# Start backend in background
echo -e "${GREEN}✅ Starting FastAPI server on port 8000...${NC}"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo -e "${GREEN}   Backend PID: $BACKEND_PID${NC}"

# Wait for backend to start
sleep 3

# ============================================================
# 2. Start Frontend Server
# ============================================================
echo ""
echo -e "${BLUE}🎨 Starting Frontend Server...${NC}"

cd "$SCRIPT_DIR/crafty-gis-client"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend
echo -e "${GREEN}✅ Starting Next.js dev server on port 3000...${NC}"
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}   Frontend PID: $FRONTEND_PID${NC}"

# Wait for frontend to start
sleep 5

# ============================================================
# 3. Print Access Information
# ============================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🚀 Crafty GIS is now running!                             ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                            ║"
echo "║  🌐 Frontend:  http://localhost:3000                       ║"
echo "║  📡 Backend:   http://localhost:8000                       ║"
echo "║  📚 API Docs:  http://localhost:8000/docs                  ║"
echo "║                                                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  📊 Available Endpoints:                                   ║"
echo "║    • /api/vegetation/*  — Vegetation indices               ║"
echo "║    • /api/soil/*        — Soil analysis                    ║"
echo "║    • /api/terrain/*     — Terrain analysis                 ║"
echo "║    • /api/weather/*     — Weather data                     ║"
echo "║    • /api/crop/*        — Crop monitoring                  ║"
echo "║    • /api/field/*       — Field management                 ║"
echo "║    • /api/report/*      — Report generation                ║"
echo "║                                                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  ⚠️  Press Ctrl+C to stop both servers                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Trap to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down Crafty GIS...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Crafty GIS stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for user to press Ctrl+C
wait
