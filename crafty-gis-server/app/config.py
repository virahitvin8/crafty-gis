"""CRAFTY GIS — Application Configuration."""

from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Application
    app_name: str = "CRAFTY GIS"
    app_version: str = "1.0.0"
    debug: bool = True
    environment: str = "development"
    log_level: str = "INFO"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Database
    database_url: str = "sqlite+aiosqlite:///./crafty_gis.db"
    db_echo: bool = False

    # ── AI Backends (ALL FREE, NO PAID KEYS NEEDED) ──────────────────────────
    # PRIMARY: Ollama (local, free, unlimited)
    # Install: https://ollama.ai | Run: ollama serve | Pull: ollama pull llama3
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    ollama_embedding_model: str = "nomic-embed-text"

    # FALLBACK 1: Hugging Face free Inference API
    # Free account at: https://huggingface.co/join
    # Free token at:   https://huggingface.co/settings/tokens
    huggingface_token: str = ""
    huggingface_model: str = "mistralai/Mistral-7B-Instruct-v0.3"

    # FALLBACK 2: LM Studio (local GUI app)
    # Free download: https://lmstudio.ai
    lmstudio_url: str = "http://localhost:1234/v1/chat/completions"

    # ── Satellite Data APIs ────────────────────────────────────────────────────
    # Copernicus (Sentinel-1/2)
    copernicus_username: str = ""
    copernicus_password: str = ""

    # NASA Earthdata (MODIS, SRTM, GEDI)
    nasa_earthdata_username: str = ""
    nasa_earthdata_password: str = ""

    # USGS EarthExplorer (Landsat)
    usgs_username: str = ""
    usgs_password: str = ""
    usgs_api_key: str = ""

    # Bhoonidhi (ISRO India)
    bhoonidhi_username: str = ""
    bhoonidhi_password: str = ""

    # Survey of India
    soi_phone: str = ""
    soi_password: str = ""

    # ── Data Directories ───────────────────────────────────────────────────────
    data_dir: str = ""
    downloads_dir: str = ""
    outputs_dir: str = ""
    projects_dir: str = ""

    # GIS Processing
    max_workers: int = 4

    # CORS
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        base = Path(__file__).parent.parent
        if not self.data_dir:
            self.data_dir = str(base / "data")
        if not self.downloads_dir:
            self.downloads_dir = str(Path(self.data_dir) / "downloads")
        if not self.outputs_dir:
            self.outputs_dir = str(Path(self.data_dir) / "outputs")
        if not self.projects_dir:
            self.projects_dir = str(Path(self.data_dir) / "projects")
        self.api_host = self.host
        self.api_port = self.port

    @property
    def has_ollama_configured(self) -> bool:
        return bool(self.ollama_base_url)

    @property
    def has_huggingface(self) -> bool:
        return bool(self.huggingface_token)


settings = Settings()
