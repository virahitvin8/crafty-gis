@echo off
:: =============================================================
:: CRAFTY GIS — One-Command Windows Launcher
:: =============================================================
:: Usage: Double-click start.bat OR run from Command Prompt
:: Starts backend (FastAPI) + frontend (Next.js)
:: Open your browser at: http://localhost:3000
:: =============================================================

title CRAFTY GIS — Starting Up

echo.
echo  ====================================================
echo    CRAFTY GIS — Starting Up
echo    Conversational Remote Analysis ^& Field Technology
echo  ====================================================
echo.

:: Check Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  ERROR: Python not found!
    echo  Install from: https://python.org
    pause
    exit /b 1
)

:: Check Node
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  ERROR: Node.js not found!
    echo  Install from: https://nodejs.org
    pause
    exit /b 1
)

set SCRIPT_DIR=%~dp0
set SERVER_DIR=%SCRIPT_DIR%crafty-gis-server
set CLIENT_DIR=%SCRIPT_DIR%crafty-gis-client

:: ── Backend Setup ───────────────────────────────────────────
echo  [1/4] Setting up Python backend...
cd /d "%SERVER_DIR%"

if not exist "venv" (
    echo        Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
echo        Installing Python packages (first run takes ~2 min)...
pip install -q --upgrade pip
pip install -q -r requirements.txt

:: Create data directories
if not exist "data\downloads" mkdir data\downloads
if not exist "data\outputs" mkdir data\outputs
if not exist "data\projects" mkdir data\projects
echo        Backend ready!

:: ── Frontend Setup ──────────────────────────────────────────
echo.
echo  [2/4] Setting up Next.js frontend...
cd /d "%CLIENT_DIR%"

if not exist "node_modules" (
    echo        Installing Node packages (first run takes ~1 min)...
    call npm install --silent
)
echo        Frontend ready!

:: ── Start Backend ───────────────────────────────────────────
echo.
echo  [3/4] Starting backend API on port 8000...
cd /d "%SERVER_DIR%"
call venv\Scripts\activate.bat
start "CRAFTY GIS - Backend" cmd /k "uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul
echo        Backend running: http://localhost:8000

:: ── Start Frontend ──────────────────────────────────────────
echo.
echo  [4/4] Starting frontend dashboard on port 3000...
cd /d "%CLIENT_DIR%"
start "CRAFTY GIS - Frontend" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
echo        Frontend running: http://localhost:3000

:: ── Open Browser ────────────────────────────────────────────
echo.
echo  Opening CRAFTY GIS in your browser...
start "" "http://localhost:3000"

echo.
echo  ====================================================
echo    CRAFTY GIS is RUNNING!
echo  ====================================================
echo    Dashboard   ->  http://localhost:3000
echo    API         ->  http://localhost:8000
echo    API Docs    ->  http://localhost:8000/docs
echo  ====================================================
echo.
echo  Two windows opened (Backend + Frontend).
echo  Close those windows to stop CRAFTY GIS.
echo.
pause
