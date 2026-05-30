import os
from pathlib import Path
from typing import Optional
from pydantic import BaseSettings, Field

class Settings(BaseSettings):
    # API Configuration
    PROJECT_NAME: str = "CRAFTY GIS"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = Field(default_factory=lambda: os.urandom(32).hex())
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # CORS
    BACKEND_CORS_ORIGINS: list = ["*"]  # In production, specify actual origins

    # Database Configuration
    DATABASE_URL: str = Field(
        default="postgresql://user:password@localhost/crafty_gis",
        description="PostgreSQL database URL"
    )

    # Redis Configuration (for Celery)
    REDIS_URL: str = Field(
        default="redis://localhost:6379",
        description="Redis URL for Celery broker"
    )

    # AI Configuration
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    # File Storage
    UPLOAD_DIR: Path = Path("./uploads")
    OUTPUT_DIR: Path = Path("./outputs")
    TEMP_DIR: Path = Path("./temp")

    # GIS Tools Configuration
    QGIS_PATH: Optional[str] = None  # Path to QGIS installation
    SAGA_PATH: Optional[str] = None  # Path to SAGA GIS installation
    GRASS_PATH: Optional[str] = None  # Path to GRASS GIS installation
    FRAGSTATS_PATH: Optional[str] = None  # Path to Fragstats installation
    GDAL_PATH: Optional[str] = None  # Path to GDAL installation

    # Processing Configuration
    MAX_CONCURRENT_TASKS: int = 4
    TASK_TIMEOUT_MINUTES: int = 60
    TEMP_FILE_EXPIRE_HOURS: int = 24

    # External API Keys for Data Sources
    COPERNICUS_USERNAME: Optional[str] = None
    COPERNICUS_PASSWORD: Optional[str] = None
    USGS_USERNAME: Optional[str] = None
    USGS_PASSWORD: Optional[str] = None
    NASA_USERNAME: Optional[str] = None
    NASA_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True

# Create global settings instance
settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(exist_ok=True)
settings.OUTPUT_DIR.mkdir(exist_ok=True)
settings.TEMP_DIR.mkdir(exist_ok=True)