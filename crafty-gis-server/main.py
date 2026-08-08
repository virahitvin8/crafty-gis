"""
CRAFTY GIS — Main Entry Point (for running directly)
Usage: python main.py  (from crafty-gis-server/ directory)
"""
import uvicorn
from pathlib import Path
import sys

# Ensure we can import app.*
sys.path.insert(0, str(Path(__file__).parent))

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
