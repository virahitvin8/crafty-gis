@echo off
chcp 65001 >nul
title PORTABLE JARVIS USB
color 0B

:: ── Detect USB drive (where this script lives) ──
set "USB_ROOT=%~dp0"
set "USB_ROOT=%USB_ROOT:~0,-1%"
set "JARVIS=%USB_ROOT%\jarvis"
set "PYTHON_PORTABLE=%USB_ROOT%\python_portable\python.exe"
set "PYTHON_SCRIPTS=%USB_ROOT%\python_portable\Scripts"

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║      PORTABLE JARVIS USB — Boot Sequence         ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  USB Root: %USB_ROOT%
echo.

:: ── Find Python ──
if exist "%PYTHON_PORTABLE%" (
    set "PYTHON=%PYTHON_PORTABLE%"
    set "PATH=%PYTHON_SCRIPTS%;%PATH%"
    echo [OK] Portable Python found
) else (
    python --version >nul 2>&1
    if %errorlevel%==0 (
        set "PYTHON=python"
        echo [OK] System Python found
    ) else (
        python3 --version >nul 2>&1
        if %errorlevel%==0 (
            set "PYTHON=python3"
            echo [OK] System Python3 found
        ) else (
            echo [ERROR] Python not found!
            echo Download portable Python from https://winpython.github.io/
            echo Extract to: %USB_ROOT%\python_portable            pause
            exit /b 1
        )
    )
)

:: ── Install deps if missing ──
"%PYTHON%" -c "import flask, flask_cors, psutil" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing dependencies (Flask, CORS, psutil)...
    "%PYTHON%" -m pip install flask flask-cors psutil --quiet
)

:: ── Redirect all temp/config to USB ──
set "TMP=%USB_ROOT%\temp"
set "TEMP=%USB_ROOT%\temp"
set "APPDATA=%USB_ROOT%\appdata"
set "LOCALAPPDATA=%USB_ROOT%\localappdata"
set "USERPROFILE=%USB_ROOT%\userprofile"
if not exist "%USB_ROOT%\temp" mkdir "%USB_ROOT%\temp"
if not exist "%USB_ROOT%\appdata" mkdir "%USB_ROOT%\appdata"

:: ── Launch ──
cd /d "%JARVIS%"
echo.
echo [LAUNCH] Starting JARVIS backend...
echo.
start "" "http://localhost:5000"
"%PYTHON%" backend.py

echo.
echo JARVIS stopped. Safe to eject USB.
pause
