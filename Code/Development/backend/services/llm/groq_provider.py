import logging
from typing import List
from groq import AsyncGroq, RateLimitError, APIStatusError, APITimeoutError
from config import Settings, get_settings
from services.llm.base import LLMProvider
from core.exceptions import LLMProviderError

logger = logging.getLogger("nexusmind.llm.groq")


class GroqProvider(LLMProvider):
    def __init__(self, settings: Settings = None):
        self.settings = settings or get_settings()
        self.api_key = self.settings.groq_api_key
        
        # Build models_to_try dynamically from environment configuration
        configured_models = list(self.settings.groq_models_list)
        if self.settings.groq_model and self.settings.groq_model not in configured_models:
            configured_models.insert(0, self.settings.groq_model)
        self.models_to_try = configured_models

        if self.api_key:
            self.client = AsyncGroq(api_key=self.api_key)
        else:
            self.client = None

    async def complete(self, system_prompt: str, user_message: str) -> str:
        if not self.client or not self.api_key:
            raise LLMProviderError("Groq API key is not configured.")

        last_error = None
        for model_name in self.models_to_try:
            try:
                logger.info(f"Attempting Groq completion with model: {model_name}")
                resp = await self.client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    temperature=0.2,
                )
                if resp.choices and resp.choices[0].message and resp.choices[0].message.content:
                    content = resp.choices[0].message.content
                    logger.info(f"Groq completion succeeded using model '{model_name}'")
                    return content
            except (RateLimitError, APIStatusError, APITimeoutError, Exception) as e:
                logger.warning(f"Groq model '{model_name}' failed: {e}. Trying fallback model...")
                last_error = e

        raise LLMProviderError(f"All configured Groq models failed ({self.models_to_try}). Last error: {str(last_error)}")

    async def list_models(self) -> List[str]:
        if not self.client or not self.api_key:
            return self.models_to_try
        try:
            resp = await self.client.models.list()
            return [m.id for m in resp.data]
        except Exception as e:
            logger.warning(f"Failed to fetch Groq models list: {e}")
            return self.models_to_try
