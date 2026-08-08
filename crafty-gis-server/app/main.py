"""
CRAFTY GIS — Main FastAPI Application Entry Point
Conversational Remote Analysis & Field Technology for GIS

Start with: uvicorn app.main:app --reload
Or simply:  python main.py (from crafty-gis-server/ directory)
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Startup / Shutdown ─────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, clean up on shutdown."""
    # Create data directories
    for d in [settings.data_dir, settings.downloads_dir, settings.outputs_dir, settings.projects_dir]:
        Path(d).mkdir(parents=True, exist_ok=True)

    logger.info("=" * 60)
    logger.info("🌍  CRAFTY GIS — Starting Up")
    logger.info(f"    Version : {settings.app_version}")
    logger.info(f"    Env     : {settings.environment}")
    logger.info(f"    AI      : {'Ollama (' + settings.ollama_model + ')' if settings.has_ollama_configured else 'HuggingFace' if settings.has_huggingface else 'None'}")
    logger.info(f"    DB      : {settings.database_url.split('///')[0]}")
    logger.info(f"    Data    : {settings.data_dir}")
    logger.info("=" * 60)

    yield

    logger.info("🛑  CRAFTY GIS — Shutting down.")


# ── FastAPI App ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CRAFTY GIS",
    description=(
        "Conversational Remote Analysis & Field Technology for GIS — "
        "AI-Powered Geospatial Intelligence Platform"
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ────────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"] if settings.debug else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ────────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    """System health check — verifies API is running."""
    return {
        "status": "ok",
        "service": "CRAFTY GIS",
        "version": settings.app_version,
        "ai_backend": "groq" if settings.has_groq else "ollama",
        "data_sources": {
            "copernicus": settings.has_copernicus,
            "nasa_earthdata": settings.has_nasa,
            "usgs": bool(settings.usgs_username),
            "bhoonidhi": bool(settings.bhoonidhi_username),
        },
    }


@app.get("/api/ai/status", tags=["System"])
async def ai_status():
    """Check AI backend connectivity (Groq + Ollama)."""
    from app.services.groq_service import GroqService
    from app.services.ollama_service import OllamaService

    groq = GroqService()
    ollama = OllamaService()
    groq_health = await groq.check_health()
    ollama_health = await ollama.check_health()
    await groq.close()
    await ollama.close()

    return {
        "primary": "groq" if settings.has_groq else "ollama",
        "groq": groq_health,
        "ollama": ollama_health,
    }


# ── API Routers ─────────────────────────────────────────────────────────────────
from app.api.analysis import router as analysis_router
from app.api.chat import router as chat_router
from app.api.projects import router as projects_router
from app.api.data import router as data_router

app.include_router(analysis_router)
app.include_router(chat_router)
app.include_router(projects_router)
app.include_router(data_router)


# ── Static Frontend (built Next.js) ─────────────────────────────────────────────
frontend_path = Path(__file__).resolve().parent.parent / "frontend" / "static"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    @app.get("/", tags=["System"])
    async def root():
        return {
            "message": "🌍 CRAFTY GIS API is running.",
            "docs": "http://localhost:8000/docs",
            "frontend": "Run `npm run dev` in crafty-gis-client/ (http://localhost:3000)",
            "hint": "Or run ./start.sh (Linux) / start.bat (Windows) to start everything.",
        }