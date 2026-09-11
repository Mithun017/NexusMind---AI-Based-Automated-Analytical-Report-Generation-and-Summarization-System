from abc import ABC, abstractmethod


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, file_bytes: bytes, filename: str) -> str:
        """Save file bytes and return relative or canonical storage path."""
        pass

    @abstractmethod
    async def load(self, path: str) -> bytes:
        """Load file bytes from storage path."""
        pass

    @abstractmethod
    async def exists(self, path: str) -> bool:
        """Check if file exists at path."""
        pass
