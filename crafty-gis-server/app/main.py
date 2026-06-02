"""
CRAFTY GIS — Main FastAPI Application
Serves the frontend static files and provides analysis endpoints.
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

app = FastAPI(title="CRAFTY GIS", description="Quantum-Powered Geospatial Analysis Platform")

# Mount the static files (built Next.js app)
frontend_path = Path(__file__).resolve().parent.parent / "frontend" / "static"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    # Fallback for development - serve a simple message
    @app.get("/")
    async def root():
        return {"message": "Frontend not built. Please build the Next.js app and copy to frontend/static"}

# Include only the essential analysis router
from app.api.analysis import router as analysis_router
app.include_router(analysis_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "CRAFTY GIS"}