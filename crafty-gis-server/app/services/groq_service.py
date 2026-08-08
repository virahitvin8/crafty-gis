"""
CRAFTY GIS — Free & Open Source AI Service
Uses ONLY free, open-source AI backends:
  1. Ollama (PRIMARY)   — local, free, unlimited, private
  2. Hugging Face (FALLBACK) — free inference API, no credit card
  3. LM Studio (OPTIONAL) — local GUI-based LLM server

Zero paid API keys required.
"""

import json
import logging
import httpx
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

# Hugging Face free inference API (no billing required, just a free account)
HF_API_URL = "https://api-inference.huggingface.co/models/{model}"
HF_FREE_MODELS = [
    "mistralai/Mistral-7B-Instruct-v0.3",
    "HuggingFaceH4/zephyr-7b-beta",
    "microsoft/DialoGPT-large",
    "tiiuae/falcon-7b-instruct",
]

# LM Studio (local GUI-based alternative to Ollama)
LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"


class OllamaService:
    """Primary AI backend — Ollama local LLM server. Free, unlimited, private."""

    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
        self.client = httpx.AsyncClient(timeout=180.0)

    async def chat(self, messages: list[dict]) -> str:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": 0.7, "top_p": 0.9},
        }
        try:
            r = await self.client.post(f"{self.base_url}/api/chat", json=payload)
            r.raise_for_status()
            return r.json().get("message", {}).get("content", "")
        except httpx.RequestError:
            logger.warning("Ollama not reachable — is it running? (`ollama serve`)")
            return ""
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            return ""

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.3},
        }
        if system_prompt:
            payload["system"] = system_prompt
        try:
            r = await self.client.post(f"{self.base_url}/api/generate", json=payload)
            r.raise_for_status()
            return r.json().get("response", "")
        except Exception:
            return ""

    async def check_health(self) -> dict:
        try:
            r = await self.client.get(f"{self.base_url}/api/tags", timeout=4.0)
            r.raise_for_status()
            models = [m["name"] for m in r.json().get("models", [])]
            return {
                "status": "connected",
                "model": self.model,
                "available_models": models,
                "model_ready": self.model in models,
            }
        except Exception as e:
            return {"status": "disconnected", "error": str(e)}

    async def close(self):
        await self.client.aclose()


class HuggingFaceService:
    """
    Fallback AI — Hugging Face Inference API (free tier).
    Register free at: https://huggingface.co/join
    Get free token at: https://huggingface.co/settings/tokens
    No credit card required.
    """

    def __init__(self):
        self.token = settings.huggingface_token
        self.model = settings.huggingface_model
        self.client = httpx.AsyncClient(timeout=60.0)

    async def chat(self, messages: list[dict]) -> str:
        if not self.token:
            return ""

        # Convert chat messages to a single prompt for HF
        prompt = self._messages_to_prompt(messages)
        url = HF_API_URL.format(model=self.model)
        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "inputs": prompt,
            "parameters": {"max_new_tokens": 512, "temperature": 0.7, "return_full_text": False},
        }
        try:
            r = await self.client.post(url, json=payload, headers=headers)
            if r.status_code == 503:
                logger.info("HuggingFace model loading, retrying...")
                return ""
            r.raise_for_status()
            data = r.json()
            if isinstance(data, list) and data:
                return data[0].get("generated_text", "").strip()
            return ""
        except Exception as e:
            logger.warning(f"HuggingFace error: {e}")
            return ""

    def _messages_to_prompt(self, messages: list[dict]) -> str:
        """Convert OpenAI-style messages to a text prompt."""
        parts = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                parts.append(f"System: {content}")
            elif role == "user":
                parts.append(f"User: {content}")
            elif role == "assistant":
                parts.append(f"Assistant: {content}")
        parts.append("Assistant:")
        return "\n".join(parts)

    async def check_health(self) -> dict:
        if not self.token:
            return {"status": "not_configured", "hint": "Set HUGGINGFACE_TOKEN in .env (free)"}
        return {"status": "configured", "model": self.model}

    async def close(self):
        await self.client.aclose()


class LMStudioService:
    """
    Optional: LM Studio local server (OpenAI-compatible, free GUI app).
    Download: https://lmstudio.ai
    """

    def __init__(self):
        self.url = LM_STUDIO_URL
        self.client = httpx.AsyncClient(timeout=120.0)

    async def chat(self, messages: list[dict]) -> str:
        payload = {"messages": messages, "temperature": 0.7, "max_tokens": 1024}
        try:
            r = await self.client.post(self.url, json=payload)
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]
        except Exception:
            return ""

    async def close(self):
        await self.client.aclose()


class HybridAIService:
    """
    Free AI orchestrator — tries backends in priority order:
      1. Ollama (local, unlimited, private)
      2. LM Studio (local GUI alternative)
      3. Hugging Face (free cloud fallback)

    No paid APIs. No rate limits that kill mid-analysis.
    """

    def __init__(self):
        self.ollama = OllamaService()
        self.lmstudio = LMStudioService()
        self.huggingface = HuggingFaceService()
        self._active_backend = "ollama"

    async def chat(self, messages: list[dict]) -> str:
        # 1. Try Ollama first
        result = await self.ollama.chat(messages)
        if result:
            self._active_backend = "ollama"
            return result

        # 2. Try LM Studio
        result = await self.lmstudio.chat(messages)
        if result:
            self._active_backend = "lmstudio"
            return result

        # 3. Try Hugging Face free API
        result = await self.huggingface.chat(messages)
        if result:
            self._active_backend = "huggingface"
            return result

        # All failed — return helpful guidance
        self._active_backend = "none"
        return (
            "⚠️ No AI backend is currently running.\n\n"
            "To enable AI:\n"
            "• Install Ollama: https://ollama.ai → run `ollama serve` → `ollama pull llama3`\n"
            "• Or install LM Studio: https://lmstudio.ai and load any model\n"
            "• Or set HUGGINGFACE_TOKEN in .env (free at huggingface.co)\n\n"
            "The platform still works for data downloads and manual analysis without AI."
        )

    async def generate(self, prompt: str, system_prompt: str = None) -> str:
        result = await self.ollama.generate(prompt, system_prompt)
        if result:
            return result
        msgs = []
        if system_prompt:
            msgs.append({"role": "system", "content": system_prompt})
        msgs.append({"role": "user", "content": prompt})
        return await self.huggingface.chat(msgs)

    async def get_status(self) -> dict:
        return {
            "active_backend": self._active_backend,
            "ollama": await self.ollama.check_health(),
            "huggingface": await self.huggingface.check_health(),
            "note": "All backends are free and open-source. No paid APIs required.",
        }

    async def close(self):
        await self.ollama.close()
        await self.lmstudio.close()
        await self.huggingface.close()
