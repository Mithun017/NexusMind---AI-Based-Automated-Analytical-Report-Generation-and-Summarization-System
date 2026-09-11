from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field


class Report(Document):
    analysis_id: PydanticObjectId
    storage_path: str
    filename: str
    page_count: int = 1
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "reports"
