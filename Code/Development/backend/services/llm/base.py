from abc import ABC, abstractmethod
from typing import List


class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, system_prompt: str, user_message: str) -> str:
        """Generate a completion from the LLM provider."""
        pass

    @abstractmethod
    async def list_models(self) -> List[str]:
        """Fetch the available models list for validation at startup."""
        pass
