"""CRAFTY GIS — Main Application Entry Point.

Conversational Remote Analysis & Field Technology for GIS.
AI-Powered GIS & Remote Sensing Problem-Solving Platform.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.db import init_db
from app.services.ollama_service import OllamaService
from app.core.ai_investigator import AIInvestigator
from app.core.workflow_engine import WorkflowEngine
from app.core.gis_processor import GISProcessor
from app.services.data_downloader import DataDownloader
from app.core.report_generator import ReportGenerator
from app.core import ANALYSIS_TYPES

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

# Global services
ollama_service: OllamaService = None
investigator: AIInvestigator = None
workflow_engine: WorkflowEngine = None
gis_processor: GISProcessor = None
data_downloader: DataDownloader = None
report_generator: ReportGenerator = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    global ollama_service, investigator, workflow_engine, gis_processor
    global data_downloader, report_generator

    logger.info("🚀 Starting CRAFTY GIS...")

    # Initialize services
    ollama_service = OllamaService()
    investigator = AIInvestigator(ollama_service)
    workflow_engine = WorkflowEngine(ollama_service)
    gis_processor = GISProcessor()
    data_downloader = DataDownloader()
    report_generator = ReportGenerator()

    # Check Ollama health
    health = await ollama_service.check_health()
    if health["status"] == "connected":
        logger.info(f"✅ Ollama connected. Model '{settings.ollama_model}' {'available' if health.get('model_available') else 'NOT available - run: ollama pull ' + settings.ollama_model}")
    else:
        logger.warning(f"⚠️  Ollama not connected: {health.get('error')}")
        logger.warning("   Run 'ollama serve' and 'ollama pull llama3' to enable AI features")

    # Initialize database
    try:
        await init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.warning(f"⚠️  Database not available: {e}")
        logger.warning("   The app will work with in-memory storage until PostGIS is configured")

    # Inject services into API modules
    from app.api import chat as chat_api
    chat_api.investigator = investigator
    chat_api.workflow_engine = workflow_engine

    from app.api import analysis as analysis_api
    analysis_api.workflow_engine = workflow_engine
    analysis_api.investigator = investigator

    from app.api import data as data_api
    data_api.downloader = data_downloader

    yield  # Application runs here

    # Shutdown
    logger.info("🛑 Shutting down CRAFTY GIS...")
    if ollama_service:
        await ollama_service.close()


app = FastAPI(
    title="CRAFTY GIS",
    description="Conversational Remote Analysis & Field Technology for GIS — AI-Powered Geospatial Problem Solving",
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
from app.api import chat, projects, analysis, data
app.include_router(chat.router)
app.include_router(projects.router)
app.include_router(analysis.router)
app.include_router(data.router)


@app.get("/")
async def root():
    """Welcome endpoint."""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "tagline": "You describe the problem. CRAFTY GIS solves it.",
        "status": "running",
        "ollama_status": (await ollama_service.check_health())["status"] if ollama_service else "not_initialized",
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
    }


@app.get("/api/config")
async def get_config():
    """Get public configuration (non-sensitive)."""
    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "ollama_model": settings.ollama_model,
        "available_analysis_types": list(ANALYSIS_TYPES.keys()),
    }
