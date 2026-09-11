from datetime import datetime
from typing import Optional, Dict, Any
from beanie import Document
from pydantic import Field


class Upload(Document):
    filename: str
    file_format: str  # "csv" | "xlsx"
    storage_path: str
    status: str = "uploaded"  # "uploaded" | "validated" | "processed" | "failed"
    upload_time: datetime = Field(default_factory=datetime.utcnow)
    validation_report: Optional[Dict[str, Any]] = None
    file_size_bytes: int

    class Settings:
        name = "uploads"
