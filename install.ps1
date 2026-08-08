# =============================================================
# CRAFTY GIS — True One-Click Installer for Windows
# =============================================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor DarkGreen
Write-Host "       🚀  Installing CRAFTY GIS...             " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor DarkGreen
Write-Host ""

# 1. Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install Git for Windows first." -ForegroundColor Red
    exit 1
}

# 2. Clone or update the repository
if (Test-Path "crafty-gis") {
    Write-Host "⚠️  Directory 'crafty-gis' already exists. Updating..." -ForegroundColor Yellow
    Set-Location "crafty-gis"
    git pull
} else {
    Write-Host "Cloning CRAFTY GIS repository..." -ForegroundColor Cyan
    git clone https://github.com/virahitvin8/crafty-gis.git
    Set-Location "crafty-gis"
}

# 3. Launch!
Write-Host ""
Write-Host "✅ Download complete! Launching CRAFTY GIS..." -ForegroundColor Green
Write-Host ""

# Execute start.bat
cmd.exe /c start.bat
