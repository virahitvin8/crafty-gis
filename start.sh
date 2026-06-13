#!/bin/bash
# =============================================================
# CRAFTY GIS — One-Command Linux/Android Launcher
# =============================================================
# Usage: ./start.sh
# Starts the backend (FastAPI) + frontend (Next.js) together.
# Open your browser at: http://localhost:3000
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/crafty-gis-server"
CLIENT_DIR="$SCRIPT_DIR/crafty-gis-client"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         🌍  CRAFTY GIS — Starting Up           ║${NC}"
echo -e "${GREEN}║   Conversational Remote Analysis & Field Tech   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Check Python ──────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}❌ Python 3 not found. Install from: https://python.org${NC}"
    exit 1
fi

# ── Check Node ────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    echo -e "${RED}❌ Node.js not found. Install from: https://nodejs.org${NC}"
    exit 1
fi

# ── Backend Setup ─────────────────────────────────────────────
echo -e "${BLUE}[1/4] Setting up Python backend...${NC}"
cd "$SERVER_DIR"

if [ ! -d "venv" ]; then
    echo "     Creating virtual environment..."
    if ! python3 -m venv venv; then
        echo ""
        echo -e "${RED}❌ Failed to create virtual environment.${NC}"
        echo -e "${YELLOW}On Debian/Ubuntu systems, you are missing the python3-venv package.${NC}"
        echo -e "Please run this command in your terminal, then try again:"
        echo -e "\n    ${GREEN}sudo apt install -y python3-venv python3.12-venv${NC}\n"
        exit 1
    fi
fi

source venv/bin/activate
echo "     Installing Python packages (first run takes ~2 min)..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo -e "${GREEN}     ✅ Backend ready${NC}"

# ── Create data directories ───────────────────────────────────
mkdir -p data/downloads data/outputs data/projects
echo -e "${GREEN}     ✅ Data directories ready${NC}"

# ── Frontend Setup ────────────────────────────────────────────
echo ""
echo -e "${BLUE}[2/4] Setting up Next.js frontend...${NC}"
cd "$CLIENT_DIR"

if [ ! -d "node_modules" ]; then
    echo "     Installing Node packages (first run takes ~1 min)..."
    npm install --silent
fi
echo -e "${GREEN}     ✅ Frontend ready${NC}"

# ── Start Backend ─────────────────────────────────────────────
echo ""
echo -e "${BLUE}[3/4] Starting backend API (port 8000)...${NC}"
cd "$SERVER_DIR"
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
sleep 3
echo -e "${GREEN}     ✅ Backend running → http://localhost:8000${NC}"
echo -e "     📚 API Docs     → http://localhost:8000/docs"

# ── Start Frontend ────────────────────────────────────────────
echo ""
echo -e "${BLUE}[4/4] Starting frontend dashboard (port 3000)...${NC}"
cd "$CLIENT_DIR"
npm run dev &
FRONTEND_PID=$!
sleep 3
echo -e "${GREEN}     ✅ Frontend running → http://localhost:3000${NC}"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅  CRAFTY GIS is RUNNING!            ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  🖥️  Dashboard   →  http://localhost:3000        ║${NC}"
echo -e "${GREEN}║  🔌 API          →  http://localhost:8000        ║${NC}"
echo -e "${GREEN}║  📚 API Docs     →  http://localhost:8000/docs   ║${NC}"
echo -e "${GREEN}║  📱 Android      →  Open 3000 in Chrome → ⋮ →   ║${NC}"
echo -e "${GREEN}║                      Add to Home Screen          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}  Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for both processes
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping CRAFTY GIS...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Stopped. Goodbye!${NC}"
    exit 0
}
trap cleanup INT TERM
wait
