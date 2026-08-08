"""
CRAFTY GIS — Desktop Application Launcher
============================================
Starts the backend server and opens a native desktop window or browser.

Usage:
    python desktop_app.py

For EXE packaging:
    pyinstaller --onefile --name "CRAFTY-GIS" desktop_app.py

No AI tokens consumed. No external API keys needed. 100% offline capable.
"""

import os
import sys
import time
import webbrowser
import threading
import signal
import socket
from pathlib import Path

# Ensure we can find the app modules
APP_DIR = Path(__file__).parent
sys.path.insert(0, str(APP_DIR))


def get_port():
    """Find an available port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def start_server(port: int):
    """Start the FastAPI server in a background thread."""
    import uvicorn
    from app.main import app

    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False,
    )
    server = uvicorn.Server(config)
    server.run()


def show_splash():
    """Show terminal splash screen (ASCII-only for Windows cp1252 compatibility)."""
    splash = r"""

    +==============================================================+
    |                                                              |
    |     ██████  █████  ██████  ██ ████████  █████  ██            |
    |    ██      ██   ██ ██   ██ ██    ██    ██   ██ ██            |
    |    ██      ███████ ██████  ██    ██    ███████ ██            |
    |    ██      ██   ██ ██   ██ ██    ██    ██   ██ ██            |
    |    ██████ ██   ██ ██   ██ ██    ██    ██   ██ ███████       |
    |                                                              |
    |           CRAFTY GIS  v4.0  --  Quantum Edition              |
    |                                                              |
    |   Quantum-Inspired Analysis Engine                          |
    |   40+ Agriculture, GIS & Remote Sensing Analyses             |
    |   Zero AI Token Cost -- 100% Offline Capable                 |
    |   Desktop Application -- No Browser Required                 |
    |                                                              |
    +==============================================================+
    """
    print(splash)


def main():
    """Main entry point for the desktop application."""
    # Set console encoding to UTF-8 for better Unicode support
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    show_splash()

    port = get_port()
    url = f"http://localhost:{port}"

    print(f"  Starting CRAFTY GIS server on port {port}...")
    print(f"  Loading desktop interface...")

    # Start server in background thread
    server_thread = threading.Thread(target=start_server, args=(port,), daemon=True)
    server_thread.start()

    # Wait for server to be ready
    import urllib.request
    for i in range(30):
        try:
            urllib.request.urlopen(f"{url}/health", timeout=1)
            break
        except Exception:
            time.sleep(0.5)
    else:
        print(f"  Server startup delayed. Opening anyway...")

    print(f"  CRAFTY GIS ready at {url}")
    print(f"  Press Ctrl+C to exit\n")

    # Try to open in pywebview (native desktop window)
    try:
        import webview
        window = webview.create_window(
            "CRAFTY GIS -- Quantum Analysis Platform",
            url,
            width=1400,
            height=900,
            min_size=(1024, 600),
            resizable=True,
            text_select=True,
        )
        webview.start(debug=False)
    except ImportError:
        # Fallback: open in default browser
        print(f"  Opening in default browser...")
        webbrowser.open(url)
        try:
            print("\n  Press Ctrl+C to stop the server and exit.")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n  CRAFTY GIS shutting down. Goodbye!")
            sys.exit(0)
    except Exception as e:
        print(f"  Desktop window error: {e}")
        print(f"  Opening in default browser instead...")
        webbrowser.open(url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n  CRAFTY GIS shutting down. Goodbye!")
            sys.exit(0)

    print("\n  CRAFTY GIS shutting down. Goodbye!")


if __name__ == "__main__":
    main()
