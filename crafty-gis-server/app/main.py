"""
CRAFTY GIS — Main Application Entry Point
FastAPI application with all services, middleware, and route registration.
"""

import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.api import chat, projects, analysis, data
from app.db import init_db, close_db

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    logger.info("=" * 60)
    logger.info("  CRAFTY GIS — Starting Up")
    logger.info(f"  Version: {settings.APP_VERSION}")
    logger.info(f"  Environment: {settings.ENVIRONMENT}")
    logger.info(f"  Debug Mode: {settings.DEBUG}")
    logger.info("=" * 60)

    # Ensure data directories exist
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.DATA_DIR, "downloads"), exist_ok=True)
    os.makedirs(os.path.join(settings.DATA_DIR, "outputs"), exist_ok=True)
    os.makedirs(os.path.join(settings.DATA_DIR, "uploads"), exist_ok=True)
    os.makedirs(os.path.join(settings.DATA_DIR, "outputs", "reports"), exist_ok=True)
    os.makedirs(os.path.join(settings.DATA_DIR, "temp"), exist_ok=True)

    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.warning(f"Database initialization deferred: {e}")

    logger.info("CRAFTY GIS is ready!")
    yield

    # Shutdown
    await close_db()
    logger.info("CRAFTY GIS shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    description="Conversational Remote Analysis & Field Technology for GIS — AI-powered geospatial problem-solving platform",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    response = await call_next(request)
    elapsed = (datetime.utcnow() - start_time).total_seconds()
    logger.debug(f"{request.method} {request.url.path} -> {response.status_code} ({elapsed:.3f}s)")
    return response


# Register routers
app.include_router(chat.router)
app.include_router(projects.router)
app.include_router(analysis.router)
app.include_router(data.router)


# Root endpoint
@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "tagline": "Conversational Remote Analysis & Field Technology for GIS",
        "description": "AI-Powered GIS & Remote Sensing Problem-Solving Platform",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "api": "/api",
        "timestamp": datetime.utcnow().isoformat(),
    }


# API info endpoint
@app.get("/api")
async def api_info():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "endpoints": {
            "chat": "/api/chat",
            "projects": "/api/projects",
            "analysis": "/api/analysis",
            "data": "/api/data",
        },
        "health": "/api/chat/health",
        "documentation": "/docs",
    }


# Health check
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
