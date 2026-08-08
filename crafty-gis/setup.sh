#!/usr/bin/env bash
set -e

# ============================================================
#  CRAFTY GIS — One-Click Setup Script
# ============================================================

BOLD=$(tput bold)
NORMAL=$(tput sgr0)
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}"
echo "   ___ ___ _   _ _____ ___   __ _ _____ ___ "
echo "  / __| _ \ | | |_   _/ _ \ / _\` |_   _/ __|"
echo " | (__|   / |_| | | || (_) | (_| | | | \__ \\"
echo "  \___|_|_\\\\___/  |_| \___/ \__,_| |_| |___/"
echo -e "${NC}"
echo -e "${BOLD}CRAFTY GIS — One-Click Setup${NORMAL}"
echo -e "Conversational Remote Analysis & Field Technology for GIS\n"

# ----- Check prerequisites -----
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

# Check Python
if command -v python3 &>/dev/null; then
    PYTHON=python3
elif command -v python &>/dev/null; then
    PYTHON=python
else
    echo "❌ Python 3.11+ not found. Install it first."
    exit 1
fi
echo "  ✅ Python: $($PYTHON --version)"

# Check Node.js
if command -v node &>/dev/null; then
    echo "  ✅ Node.js: $(node --version)"
else
    echo "❌ Node.js 20+ not found. Install it first."
    exit 1
fi

# Check Ollama
if command -v ollama &>/dev/null; then
    echo "  ✅ Ollama: $(ollama --version 2>/dev/null || echo 'installed')"
else
    echo -e "  ⚠️  Ollama not found. Install from https://ollama.ai/"
    echo "     You'll need it for local AI features."
fi

# ----- Setup Python virtual environment -----
echo -e "\n${YELLOW}[2/6] Setting up Python virtual environment...${NC}"
cd "$(dirname "$0")/crafty-gis-server"

if [ ! -d "venv" ]; then
    $PYTHON -m venv venv
    echo "  ✅ Virtual environment created"
else
    echo "  ✅ Virtual environment exists"
fi

source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || true

# Install Python dependencies
echo -e "\n${YELLOW}[3/6] Installing Python dependencies...${NC}"
$PYTHON -m pip install --quiet --upgrade pip
$PYTHON -m pip install --quiet -r requirements.txt
echo "  ✅ Python dependencies installed"

# ----- Install Node.js dependencies -----
echo -e "\n${YELLOW}[4/6] Installing Node.js dependencies...${NC}"
cd ../crafty-gis-client

if [ -f "package-lock.json" ]; then
    npm ci --silent 2>/dev/null || npm install --silent
else
    npm install --silent
fi
echo "  ✅ Node.js dependencies installed"

# ----- Pull Ollama model -----
echo -e "\n${YELLOW}[5/6] Pulling AI model (first time may take a while)...${NC}"
if command -v ollama &>/dev/null; then
    ollama pull llama3.1:8b 2>/dev/null || echo "  ⚠️  Could not pull model. Run 'ollama pull llama3.1:8b' manually."
    echo "  ✅ AI model ready"
else
    echo "  ⚠️  Skipping (Ollama not installed)"
fi

# ----- Start services -----
echo -e "\n${YELLOW}[6/6] Starting CRAFTY GIS...${NC}"

# Start backend in background
cd ../crafty-gis-server
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || true
echo "  Starting backend on http://localhost:8000..."
$PYTHON -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend in background
cd ../crafty-gis-client
echo "  Starting frontend on http://localhost:3000..."
npm run dev &
FRONTEND_PID=$!

echo -e "\n${GREEN}${BOLD}========================================${NC}"
echo -e "${GREEN}${BOLD}  🚀 CRAFTY GIS is running!${NC}"
echo -e "${GREEN}${BOLD}  Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}${BOLD}  Backend:  http://localhost:8000${NC}"
echo -e "${GREEN}${BOLD}  API Docs: http://localhost:8000/docs${NC}"
echo -e "${GREEN}${BOLD}========================================${NC}"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap Ctrl+C to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
