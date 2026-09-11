from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from scipy.signal import savgol_filter
from config import Settings, get_settings


COLUMN_MAP = {
    "Sample ID": "sample_id",
    "Retention Time": "retention_time",
    "Peak Area": "peak_area",
    "Peak Height": "peak_height",
    "Intensity": "intensity",
    "Concentration": "concentration",
    "Compound Name": "compound_name",
    "Analysis Type": "analysis_type",
}


def _rename_to_internal_schema(df: pd.DataFrame) -> pd.DataFrame:
    """Step 1: Idempotent rename. Maps Title-Case spec columns to snake_case."""
    return df.rename(columns={k: v for k, v in COLUMN_MAP.items() if k in df.columns})


def apply_noise_reduction(series: pd.Series, settings: Settings) -> pd.Series:
    """
    Savitzky-Golay noise filtering with small-dataset guard.
    savgol_filter requires: window_length < len(data) AND window_length is odd.
    """
    n = len(series)
    window = settings.sg_window_length
    polyorder = settings.sg_polyorder

    if n < 4:
        return series  # too few points — skip smoothing

    window = min(window, n - 1 if (n - 1) % 2 == 1 else n - 2)
    window = max(window, polyorder + 1)
    if window % 2 == 0:
        window -= 1
    if window <= polyorder or window < 3:
        return series  # cannot fit — skip

    try:
        smoothed = savgol_filter(series.values, window_length=window, polyorder=polyorder)
        return pd.Series(smoothed, index=series.index)
    except Exception:
        return series


class Preprocessor:
    def __init__(self, settings: Settings = None):
        self.settings = settings or get_settings()

    def process(self, raw_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Executes full preprocessing pipeline in strict 7-step sequence.
        Returns (canonical_df, metadata_dict).
        """
        raw_count = len(raw_df)
        df = raw_df.copy()

        # Step 1: Canonical column rename (Title-Case -> snake_case)
        df = _rename_to_internal_schema(df)

        # Step 2: Missing value handling
        numeric_cols = ["retention_time", "peak_area", "peak_height", "intensity", "concentration"]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
                median_val = df[col].median()
                if pd.isna(median_val):
                    median_val = 0.0
                df[col] = df[col].fillna(median_val)

        categorical_cols = ["sample_id", "compound_name", "analysis_type"]
        for col in categorical_cols:
            if col in df.columns:
                df[col] = df[col].fillna("Unknown").astype(str)

        # Step 3: Duplicate removal + reset_index(drop=True)
        subset_cols = [c for c in ["sample_id", "retention_time", "compound_name"] if c in df.columns]
        if subset_cols:
            df = df.drop_duplicates(subset=subset_cols)
        df = df.reset_index(drop=True)

        cleaned_count = len(df)

        # Step 4: Normalization (min-max scale; originals retained)
        for col in ["peak_area", "peak_height", "intensity"]:
            if col in df.columns:
                c_min = float(df[col].min()) if not df[col].empty else 0.0
                c_max = float(df[col].max()) if not df[col].empty else 1.0
                denom = (c_max - c_min) if (c_max - c_min) != 0 else 1.0
                df[f"{col}_norm"] = (df[col] - c_min) / denom

        # Step 5: Savitzky-Golay noise reduction
        if "peak_area_norm" in df.columns:
            df["peak_area_norm"] = apply_noise_reduction(df["peak_area_norm"], self.settings)
        if "intensity_norm" in df.columns:
            df["intensity_norm"] = apply_noise_reduction(df["intensity_norm"], self.settings)

        # Step 6: Feature extraction
        total_area = float(df["peak_area"].sum()) if ("peak_area" in df.columns and not df["peak_area"].empty) else 0.0
        if total_area > 0:
            df["relative_abundance"] = (df["peak_area"] / total_area) * 100.0
        else:
            df["relative_abundance"] = 0.0

        if "intensity" in df.columns and len(df) > 1:
            baseline_noise = float(df["intensity"].std()) + 1e-9
        else:
            baseline_noise = 1.0

        if "peak_height" in df.columns:
            df["snr"] = df["peak_height"] / baseline_noise
        else:
            df["snr"] = 0.0

        # Assign deterministic peak_id
        df["peak_id"] = [f"PK-{i+1:03d}" for i in range(len(df))]

        # Step 7: Return canonical DataFrame
        metadata = {
            "raw_record_count": raw_count,
            "cleaned_record_count": cleaned_count,
            "duplicates_removed": raw_count - cleaned_count,
            "sample_id": str(df["sample_id"].iloc[0]) if not df.empty and "sample_id" in df.columns else "Unknown",
            "analysis_type": str(df["analysis_type"].iloc[0]) if not df.empty and "analysis_type" in df.columns else "Chromatography",
        }

        return df, metadata
