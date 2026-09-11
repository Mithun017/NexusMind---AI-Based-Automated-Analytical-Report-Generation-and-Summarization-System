from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import Field


class Analysis(Document):
    upload_id: PydanticObjectId
    sample_id: Optional[str] = None
    status: str = "processing"  # "processing" | "complete" | "failed"
    kpis: Dict[str, Any] = Field(default_factory=dict)
    peak_details: List[Dict[str, Any]] = Field(default_factory=list)
    anomaly_results: List[Dict[str, Any]] = Field(default_factory=list)
    kg_context: Dict[str, Any] = Field(default_factory=dict)
    ai_summary: Optional[Dict[str, Any]] = None
    ai_interpretation: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "analyses"
