"""CRAFTY GIS — Ollama Service: Local LLM integration."""

import json
import logging
import httpx
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class OllamaService:
    """Service for interacting with local Ollama instance."""

    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
        self.client = httpx.AsyncClient(timeout=180.0)

    async def chat(self, messages: list[dict], stream: bool = False) -> str:
        """Send a chat completion request to Ollama."""
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": stream,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
            },
        }
        try:
            response = await self.client.post(
                f"{self.base_url}/api/chat",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "")

        except httpx.HTTPStatusError as e:
            logger.error(f"Ollama HTTP error: {e.response.status_code} - {e.response.text}")
            return "I'm having trouble connecting to the AI model. Please make sure Ollama is running."
        except httpx.RequestError as e:
            logger.error(f"Ollama connection error: {e}")
            return "Cannot connect to Ollama. Please ensure it's running (`ollama serve`)."
        except Exception as e:
            logger.error(f"Unexpected Ollama error: {e}")
            return f"An unexpected error occurred: {str(e)}"

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate a completion using the raw generate endpoint."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
            },
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

        except Exception as e:
            logger.error(f"Ollama generate error: {e}")
            return ""

    async def check_health(self) -> dict:
        """Check if Ollama is running and list available models."""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags", timeout=5.0)
            response.raise_for_status()
            data = response.json()
            models = [m["name"] for m in data.get("models", [])]
            return {
                "status": "connected",
                "model_configured": self.model,
                "model_available": self.model in models,
                "available_models": models,
            }
        except Exception as e:
            return {
                "status": "disconnected",
                "error": str(e),
                "model_configured": self.model,
            }

    async def close(self):
        await self.client.aclose()
