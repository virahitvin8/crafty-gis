"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path


class Settings(BaseSettings):
    # Application
    app_name: str = "CRAFTY GIS"
    app_version: str = "0.1.0"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://crafty:crafty_secret@localhost:5432/crafty_gis"

    # Ollama / Local LLM
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"  # or deepseek-coder, mistral, etc.
    ollama_embedding_model: str = "nomic-embed-text"

    # Data directories
    data_dir: str = str(Path(__file__).parent.parent.parent / "data")
    downloads_dir: str = ""
    outputs_dir: str = ""
    projects_dir: str = ""

    # GIS Processing
    max_workers: int = 4

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.downloads_dir:
            self.downloads_dir = str(Path(self.data_dir) / "downloads")
        if not self.outputs_dir:
            self.outputs_dir = str(Path(self.data_dir) / "outputs")
        if not self.projects_dir:
            self.projects_dir = str(Path(self.data_dir) / "projects")


settings = Settings()
