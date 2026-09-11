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
        
        configured_models = list(self.settings.openrouter_models_list)
        if self.settings.openrouter_model and self.settings.openrouter_model not in configured_models:
            configured_models.insert(0, self.settings.openrouter_model)
        self.models_to_try = configured_models

    async def complete(self, system_prompt: str, user_message: str) -> str:
        if not self.api_key:
            raise LLMProviderError("OpenRouter API key is not configured.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://nexusmind.ai",
            "X-Title": "NexusMind Analytical Report System",
        }

        last_error = None
        async with httpx.AsyncClient(timeout=60.0) as client:
            for model_name in self.models_to_try:
                payload = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.2,
                }
                try:
                    logger.info(f"Attempting OpenRouter completion with model: {model_name}")
                    resp = await client.post(self.COMPLETIONS_ENDPOINT, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        content = data["choices"][0]["message"]["content"]
                        logger.info(f"OpenRouter completion succeeded using model '{model_name}'")
                        return content
                    else:
                        logger.warning(f"OpenRouter model '{model_name}' returned status {resp.status_code}: {resp.text}")
                        last_error = f"Status {resp.status_code}: {resp.text}"
                except Exception as e:
                    logger.warning(f"OpenRouter model '{model_name}' failed: {e}")
                    last_error = e

        raise LLMProviderError(f"All OpenRouter models failed ({self.models_to_try}). Last error: {str(last_error)}")

    async def list_models(self) -> List[str]:
        if not self.api_key:
            return self.models_to_try
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                resp = await client.get(self.MODELS_ENDPOINT, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return [m["id"] for m in data.get("data", [])]
        except Exception as e:
            logger.warning(f"Failed to fetch OpenRouter models list: {e}")
        return self.models_to_try
