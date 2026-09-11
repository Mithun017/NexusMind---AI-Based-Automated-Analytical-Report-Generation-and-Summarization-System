import os
import re
import uuid
from pathlib import Path
from services.storage.base import StorageBackend
from core.exceptions import StorageError


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save(self, file_bytes: bytes, filename: str) -> str:
        try:
            # Guarantee the target directory exists
            self.base_dir.mkdir(parents=True, exist_ok=True)
            
            # Sanitize filename for Windows & POSIX filesystem safety
            raw_name = Path(filename).name
            clean_name = re.sub(r'[\\/*?:"<>|]', '_', raw_name)
            unique_name = f"{uuid.uuid4().hex}_{clean_name}"
            
            target_path = (self.base_dir / unique_name).resolve()
            target_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(target_path, "wb") as f:
                f.write(file_bytes)
            return str(target_path)
        except Exception as e:
            raise StorageError(f"Failed to save file '{filename}' locally: {str(e)}")

    async def load(self, path: str) -> bytes:
        try:
            target_path = Path(path)
            if not target_path.exists():
                if not target_path.is_absolute():
                    target_path = self.base_dir / path
                if not target_path.exists():
                    candidate = self.base_dir / Path(path).name
                    if candidate.exists():
                        target_path = candidate
                    else:
                        raise StorageError(f"File not found at path '{path}'")
            with open(target_path, "rb") as f:
                return f.read()
        except Exception as e:
            if isinstance(e, StorageError):
                raise
            raise StorageError(f"Failed to load file at path '{path}': {str(e)}")

    async def exists(self, path: str) -> bool:
        target_path = Path(path)
        if target_path.exists():
            return True
        if not target_path.is_absolute() and (self.base_dir / path).exists():
            return True
        return (self.base_dir / Path(path).name).exists()
