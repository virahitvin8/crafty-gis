#!/bin/bash
# =============================================================
# CRAFTY GIS — True One-Click Installer
# =============================================================

set -e

echo -e "\033[0;32m"
echo "╔══════════════════════════════════════════════════╗"
echo "║       🚀  Installing CRAFTY GIS...             ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "\033[0m"

# 1. Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "\033[0;31m❌ Git is not installed. Please install git first.\033[0m"
    exit 1
fi

# 2. Clone the repository
if [ -d "crafty-gis" ]; then
    echo -e "\033[1;33m⚠️  Directory 'crafty-gis' already exists. Updating...\033[0m"
    cd crafty-gis
    git pull
else
    echo "Cloning CRAFTY GIS repository..."
    git clone https://github.com/virahitvin8/crafty-gis.git
    cd crafty-gis
fi

# 3. Make start.sh executable
chmod +x start.sh

# 4. Launch!
echo ""
echo -e "\033[0;32m✅ Download complete! Launching CRAFTY GIS...\033[0m"
echo ""

exec ./start.sh
