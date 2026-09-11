import logging
from typing import List
import httpx
from config import Settings, get_settings
from services.llm.base import LLMProvider
from core.exceptions import LLMProviderError

logger = logging.getLogger("nexusmind.llm.openrouter")


class OpenRouterProvider(LLMProvider):
    MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models"
    COMPLETIONS_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

    def __init__(self, settings: Settings = None):
        self.settings = settings or get_settings()
        self.api_key = self.settings.openrouter_api_key
        self.model = self.settings.openrouter_model

    async def complete(self, system_prompt: str, user_message: str) -> str:
        if not self.api_key:
            raise LLMProviderError("OpenRouter API key is not configured.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://nexusmind.ai",
            "X-Title": "NexusMind Analytical Report System",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.2,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(self.COMPLETIONS_ENDPOINT, headers=headers, json=payload)
                if resp.status_code != 200:
                    raise LLMProviderError(f"OpenRouter returned status {resp.status_code}: {resp.text}")
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            if isinstance(e, LLMProviderError):
                raise
            logger.warning(f"OpenRouter call failed: {e}")
            raise LLMProviderError(f"OpenRouter provider error: {str(e)}") from e

    async def list_models(self) -> List[str]:
        if not self.api_key:
            return []
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                resp = await client.get(self.MODELS_ENDPOINT, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return [m["id"] for m in data.get("data", [])]
        except Exception as e:
            logger.warning(f"Failed to fetch OpenRouter models list: {e}")
        return []
