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
        self.model = self.settings.groq_model
        if self.api_key:
            self.client = AsyncGroq(api_key=self.api_key)
        else:
            self.client = None

    async def complete(self, system_prompt: str, user_message: str) -> str:
        if not self.client or not self.api_key:
            raise LLMProviderError("Groq API key is not configured.")

        try:
            resp = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.2,
            )
            return resp.choices[0].message.content
        except (RateLimitError, APIStatusError, APITimeoutError) as e:
            logger.warning(f"Groq API error: {e}")
            raise LLMProviderError(f"Groq provider error: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected Groq error: {e}")
            raise LLMProviderError(f"Groq provider unexpected error: {str(e)}") from e

    async def list_models(self) -> List[str]:
        if not self.client or not self.api_key:
            return []
        try:
            resp = await self.client.models.list()
            return [m.id for m in resp.data]
        except Exception as e:
            logger.warning(f"Failed to fetch Groq models list: {e}")
            return []
