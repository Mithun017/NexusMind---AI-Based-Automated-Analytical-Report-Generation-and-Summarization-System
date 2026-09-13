import os
import re
import uuid
from pathlib import Path
from services.storage.base import StorageBackend
from core.exceptions import StorageError


def _to_fs_path(p: Path) -> str:
    """Resolve path and apply Windows extended-length prefix (\\\\?\\) if needed to bypass MAX_PATH 260 limit."""
    resolved = str(p.resolve())
    if os.name == "nt" and not resolved.startswith("\\\\?\\") and not resolved.startswith("//"):
        return "\\\\?\\" + resolved
    return resolved


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir).resolve()
        try:
            os.makedirs(_to_fs_path(self.base_dir), exist_ok=True)
        except Exception:
            self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save(self, file_bytes: bytes, filename: str) -> str:
        try:
            # Guarantee the target directory exists
            os.makedirs(_to_fs_path(self.base_dir), exist_ok=True)
            
            # Sanitize and truncate filename for safety
            raw_name = Path(filename).name
            clean_name = re.sub(r'[\\/*?:"<>|\s]', '_', raw_name)
            # Use short 8-character unique hash + clean name to keep paths compact
            unique_name = f"{uuid.uuid4().hex[:8]}_{clean_name[:48]}"
            
            target_path = (self.base_dir / unique_name).resolve()
            os.makedirs(_to_fs_path(target_path.parent), exist_ok=True)
            
            fs_path = _to_fs_path(target_path)
            with open(fs_path, "wb") as f:
                f.write(file_bytes)
            return str(target_path)
        except Exception as e:
            raise StorageError(f"Failed to save file '{filename}' locally: {str(e)}")

    async def load(self, path: str) -> bytes:
        try:
            target_path = Path(path)
            if not target_path.exists():
                candidates = [
                    self.base_dir / path,
                    self.base_dir / Path(path).name,
                    Path(__file__).resolve().parents[2] / "uploads" / Path(path).name,
                    Path(__file__).resolve().parents[3] / "uploads" / Path(path).name,
                    Path(os.getcwd()) / "uploads" / Path(path).name,
                ]
                found = False
                for c in candidates:
                    if c.exists():
                        target_path = c
                        found = True
                        break
                if not found:
                    raise StorageError(f"File not found at path '{path}'")
            
            fs_path = _to_fs_path(target_path)
            with open(fs_path, "rb") as f:
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
