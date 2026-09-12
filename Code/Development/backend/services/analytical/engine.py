from typing import List, Dict, Any
import numpy as np
import pandas as pd
from pydantic import BaseModel


class PeakDetail(BaseModel):
    peak_id: str
    retention_time: float
    peak_area: float
    peak_height: float
    intensity: float
    concentration: float
    compound_name: str
    relative_abundance: float
    snr: float


class AnalyticalResult(BaseModel):
    total_peaks: int
    major_peaks: int
    quality_score: float
    max_area: float
    avg_intensity: float
    total_area: float
    peak_details: List[PeakDetail]


class AnalyticalEngine:
    def analyze(self, df: pd.DataFrame) -> AnalyticalResult:
        """
        Calculates exact deterministic metrics from canonical DataFrame.
        No LLM is involved.
        """
        if df.empty:
            return AnalyticalResult(
                total_peaks=0,
                major_peaks=0,
                quality_score=0.0,
                max_area=0.0,
                avg_intensity=0.0,
                total_area=0.0,
                peak_details=[],
            )

        total_peaks = len(df)
        total_area = float(df["peak_area"].sum()) if "peak_area" in df.columns else 0.0
        max_area = float(df["peak_area"].max()) if "peak_area" in df.columns else 0.0
        avg_intensity = float(df["intensity"].mean()) if "intensity" in df.columns else 0.0

        # Major peaks: relative abundance > 5.0%
        if "relative_abundance" in df.columns:
            major_peaks = int((df["relative_abundance"] > 5.0).sum())
        else:
            major_peaks = 0

        # Quality score calculation:
        # Completeness ratio (non-null / non-zero essential fields)
        essential_cols = ["retention_time", "peak_area", "peak_height", "intensity"]
        valid_cols = [c for c in essential_cols if c in df.columns]
        if valid_cols:
            completeness = 1.0 - (df[valid_cols].isna().sum().sum() / (total_peaks * len(valid_cols)))
        else:
            completeness = 0.5

        # Peak resolution proxy: minimum distance between sorted retention times
        if total_peaks > 1 and "retention_time" in df.columns:
            sorted_rt = np.sort(df["retention_time"].values)
            diffs = np.diff(sorted_rt)
            min_diff = float(np.min(diffs)) if len(diffs) > 0 else 0.5
            # resolution factor from min separation (e.g. >= 0.2 min separation gets max score)
            resolution_factor = min(1.0, max(0.4, min_diff / 0.2))
        else:
            resolution_factor = 0.9

        quality_score = round(float(completeness * resolution_factor * 100.0), 1)
        quality_score = min(100.0, max(0.0, quality_score))

        records = df.to_dict("records")
        peak_details: List[PeakDetail] = [
            PeakDetail(
                peak_id=str(r.get("peak_id", f"PK-{idx+1:03d}")),
                retention_time=round(float(r.get("retention_time", 0.0)), 3),
                peak_area=round(float(r.get("peak_area", 0.0)), 2),
                peak_height=round(float(r.get("peak_height", 0.0)), 2),
                intensity=round(float(r.get("intensity", 0.0)), 2),
                concentration=round(float(r.get("concentration", 0.0)), 4),
                compound_name=str(r.get("compound_name", "Unknown")),
                relative_abundance=round(float(r.get("relative_abundance", 0.0)), 2),
                snr=round(float(r.get("snr", 0.0)), 2),
            )
            for idx, r in enumerate(records)
        ]

        return AnalyticalResult(
            total_peaks=total_peaks,
            major_peaks=major_peaks,
            quality_score=quality_score,
            max_area=round(max_area, 2),
            avg_intensity=round(avg_intensity, 2),
            total_area=round(total_area, 2),
            peak_details=peak_details,
        )
