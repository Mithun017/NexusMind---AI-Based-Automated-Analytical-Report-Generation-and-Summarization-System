from abc import ABC, abstractmethod
from typing import List, Dict, Any
import pandas as pd
from pydantic import BaseModel


class AnomalyResult(BaseModel):
    peak_id: str
    retention_time: float
    anomaly_score: float  # 0.0 - 1.0 (higher = more anomalous)
    is_anomaly: bool
    confidence: float  # percentage 0.0 - 100.0
    contributing_features: Dict[str, float]
    classification: str  # "Normal" | "Potential Anomaly" | "Confirmed Anomaly"


class AnomalyDetector(ABC):
    @abstractmethod
    def fit(self, df: pd.DataFrame) -> None:
        """Fit the anomaly detection model on chromatographic features."""
        pass

    @abstractmethod
    def predict(self, df: pd.DataFrame) -> List[AnomalyResult]:
        """Score each peak and return structured anomaly predictions."""
        pass
