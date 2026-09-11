import pandas as pd
from pathlib import Path
from services.preprocessing.preprocessor import Preprocessor
from config import Settings

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "sample_analytical.csv"


def test_preprocessing_canonical_schema_and_features():
    raw_df = pd.read_csv(FIXTURE_PATH)
    # Ensure raw contains Title-Case spec names
    assert "Retention Time" in raw_df.columns

    preprocessor = Preprocessor()
    clean_df, meta = preprocessor.process(raw_df)

    # Step 1 Assertions: column rename
    assert "retention_time" in clean_df.columns
    assert "peak_area" in clean_df.columns
    assert "Retention Time" not in clean_df.columns
    assert "Peak Area" not in clean_df.columns

    # Feature extraction assertions
    assert "relative_abundance" in clean_df.columns
    assert "snr" in clean_df.columns
    assert "peak_id" in clean_df.columns
    assert "peak_area_norm" in clean_df.columns

    # Sum of relative abundance should be ~100%
    assert abs(clean_df["relative_abundance"].sum() - 100.0) < 0.1

    # Metadata assertions
    assert meta["raw_record_count"] == len(raw_df)
    assert meta["cleaned_record_count"] == len(clean_df)
    assert meta["sample_id"] == "SMP-001"


def test_savgol_small_dataset_guard():
    # Test with 3 rows (smaller than sg_window_length of 5)
    small_df = pd.DataFrame({
        "Sample ID": ["SMP-002", "SMP-002", "SMP-002"],
        "Retention Time": [1.0, 2.0, 3.0],
        "Peak Area": [100.0, 200.0, 300.0],
        "Peak Height": [10.0, 20.0, 30.0],
        "Intensity": [15.0, 25.0, 35.0],
        "Concentration": [0.1, 0.2, 0.3],
        "Compound Name": ["A", "B", "C"],
        "Analysis Type": ["HPLC", "HPLC", "HPLC"],
    })

    preprocessor = Preprocessor()
    clean_df, meta = preprocessor.process(small_df)
    assert len(clean_df) == 3
    assert "peak_area_norm" in clean_df.columns
    assert clean_df["retention_time"].tolist() == [1.0, 2.0, 3.0]
