from typing import List, Union, Dict, Any
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from config import Settings, get_settings
from services.ml.base import AnomalyDetector, AnomalyResult


class IsolationForestDetector(AnomalyDetector):
    FEATURES = ["retention_time", "peak_area", "peak_height", "intensity", "concentration"]

    def __init__(self, settings: Settings = None):
        self.settings = settings or get_settings()
        contamination_raw = self.settings.ml_contamination
        if contamination_raw == "auto":
            contamination: Union[str, float] = "auto"
        else:
            try:
                contamination = float(contamination_raw)
            except ValueError:
                contamination = 0.1

        self.model = IsolationForest(
            contamination=contamination,
            random_state=self.settings.ml_random_state,
            n_estimators=50,
            n_jobs=-1,
        )

    def fit(self, df: pd.DataFrame) -> None:
        if df.empty:
            return
        X = df[self.FEATURES].fillna(0)
        self.model.fit(X)

    def predict(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        if df.empty:
            return []

        # Positional alignment fix: reset index after deduplication
        df_aligned = df.reset_index(drop=True)
        X = df_aligned[self.FEATURES].fillna(0)

        # Fit if not already fitted or fit per-dataset
        self.fit(df_aligned)

        scores = self.model.decision_function(X)
        min_s = float(scores.min())
        max_s = float(scores.max())
        denom = (max_s - min_s) if (max_s - min_s) > 0 else 1.0

        # Invert decision function: lower raw score means more anomalous -> mapped to higher normalized score [0, 1]
        normalized = 1.0 - (scores - min_s) / denom
        labels = self.model.predict(X)

        results: List[Dict[str, Any]] = []
        records = df_aligned.to_dict("records")
        for pos, row in enumerate(records):
            score = float(normalized[pos])
            is_anomaly = bool(labels[pos] == -1)
            confidence = round(score * 100.0, 1)

            if score > 0.8 or is_anomaly:
                classification = "Confirmed Anomaly"
            elif score > 0.5:
                classification = "Potential Anomaly"
            else:
                classification = "Normal"

            contributing_features = {
                f: round(float(row.get(f, 0.0)), 4) for f in self.FEATURES
            }

            results.append({
                "peak_id": str(row.get("peak_id", f"PK-{pos+1:03d}")),
                "retention_time": round(float(row.get("retention_time", 0.0)), 3),
                "anomaly_score": round(score, 4),
                "is_anomaly": is_anomaly,
                "confidence": confidence,
                "contributing_features": contributing_features,
                "classification": classification,
            })

        return results
