"""Shared test fixtures for CRAFTY GIS backend tests."""
import os
import tempfile
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def _setup_test_env(tmp_path):
    """Set up test environment with temp directories and patched settings."""
    os.environ["DATA_DIR"] = str(tmp_path / "data")
    os.environ["DOWNLOADS_DIR"] = str(tmp_path / "data" / "downloads")
    os.environ["OUTPUTS_DIR"] = str(tmp_path / "data" / "outputs")
    os.environ["PROJECTS_DIR"] = str(tmp_path / "data" / "projects")
    os.makedirs(tmp_path / "data" / "downloads", exist_ok=True)
    os.makedirs(tmp_path / "data" / "outputs", exist_ok=True)
    os.makedirs(tmp_path / "data" / "projects", exist_ok=True)


@pytest.fixture
async def client():
    """Async test client with mocked external dependencies."""
    # Patch settings to add missing DATA_DIR alias and prevent real I/O
    with patch("app.config.settings") as mock_settings, \
         patch("app.api.data.settings", mock_settings), \
         patch("app.core.report_generator.settings", mock_settings), \
         patch("app.api.chat._ollama_service") as mock_ollama, \
         patch("app.api.chat.investigator") as mock_investigator, \
         patch("app.api.chat.WorkflowEngine") as mock_wf_class, \
         patch("app.api.data.downloader") as mock_downloader:

        # Configure settings mock
        mock_settings.DATA_DIR = os.environ.get("DATA_DIR", "/tmp/test-data")
        mock_settings.data_dir = mock_settings.DATA_DIR
        mock_settings.downloads_dir = os.path.join(mock_settings.DATA_DIR, "downloads")
        mock_settings.outputs_dir = os.path.join(mock_settings.DATA_DIR, "outputs")
        mock_settings.projects_dir = os.path.join(mock_settings.DATA_DIR, "projects")

        # Configure mocks
        mock_investigator.start_investigation = AsyncMock(return_value={
            "complete": False,
            "question": "Which area would you like to analyze?",
            "suggestions": ["Delhi", "Mumbai", "Bangalore"],
            "context": {"location": "India"},
            "is_wizard_mode": True,
            "progress_text": "1/8 fields collected",
        })
        mock_investigator.continue_investigation = AsyncMock(return_value={
            "complete": False,
            "question": "What time period?",
            "suggestions": ["Last year", "Last 5 years"],
            "context": {},
            "is_wizard_mode": False,
        })
        mock_downloader.download = AsyncMock(return_value={"status": "success"})

        from app.main import app
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
