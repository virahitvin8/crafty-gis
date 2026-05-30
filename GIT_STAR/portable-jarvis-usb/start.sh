#!/usr/bin/env bash
# ── PORTABLE JARVIS USB — Linux/Mac Launcher ──

USB_ROOT="$(cd "$(dirname "$0")" && pwd)"
JARVIS="$USB_ROOT/jarvis"
PYTHON_PORTABLE="$USB_ROOT/python_portable/bin/python3"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║      PORTABLE JARVIS USB — Boot Sequence         ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "USB Root: $USB_ROOT"
echo ""

# ── Find Python ──
if [ -f "$PYTHON_PORTABLE" ]; then
    PYTHON="$PYTHON_PORTABLE"
    echo "[OK] Portable Python found"
elif command -v python3 &> /dev/null; then
    PYTHON="python3"
    echo "[OK] System Python3 found"
elif command -v python &> /dev/null; then
    PYTHON="python"
    echo "[OK] System Python found"
else
    echo "[ERROR] Python not found! Install python3 or add portable Python to USB."
    exit 1
fi

# ── Install deps if missing ──
if ! "$PYTHON" -c "import flask, flask_cors, psutil" 2>/dev/null; then
    echo "[INFO] Installing dependencies..."
    "$PYTHON" -m pip install flask flask-cors psutil --quiet --user
fi

# ── Redirect temp/config to USB ──
export TMP="$USB_ROOT/temp"
export TEMP="$USB_ROOT/temp"
export HOME="$USB_ROOT/home"
mkdir -p "$USB_ROOT/temp" "$USB_ROOT/home"

# ── Launch ──
cd "$JARVIS"
echo ""
echo "[LAUNCH] Starting JARVIS backend..."
echo ""

# Open browser (cross-platform)
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5000" &
elif command -v open &> /dev/null; then
    open "http://localhost:5000" &
fi

"$PYTHON" backend.py

echo ""
echo "JARVIS stopped. Safe to eject USB."
