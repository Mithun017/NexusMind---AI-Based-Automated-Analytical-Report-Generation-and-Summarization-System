from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import Field


class Sample(Document):
    sample_id: str
    upload_id: PydanticObjectId
    analysis_type: Optional[str] = "Chromatography"
    raw_record_count: int
    cleaned_record_count: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "samples"
