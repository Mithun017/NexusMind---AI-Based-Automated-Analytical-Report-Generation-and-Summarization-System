import pandas as pd
import numpy as np
from config import Settings
from services.ml.isolation_forest import IsolationForestDetector


def test_planted_outlier_detection():
    # Generate 19 normal peaks + 1 extreme outlier
    np.random.seed(42)
    normal_data = {
        "peak_id": [f"PK-{i+1:03d}" for i in range(19)],
        "retention_time": np.linspace(1.0, 10.0, 19),
        "peak_area": np.random.normal(50000, 2000, 19),
        "peak_height": np.random.normal(10000, 500, 19),
        "intensity": np.random.normal(10500, 500, 19),
        "concentration": np.random.normal(0.05, 0.002, 19),
    }
    df_normal = pd.DataFrame(normal_data)

    outlier = pd.DataFrame([{
        "peak_id": "PK-020-OUTLIER",
        "retention_time": 25.0,
        "peak_area": 9999999.0,
        "peak_height": 888888.0,
        "intensity": 900000.0,
        "concentration": 5.0,
    }])

    full_df = pd.concat([df_normal, outlier], ignore_index=True)

    settings = Settings(ml_contamination="0.1", ml_random_state=42)
    detector = IsolationForestDetector(settings)
    results = detector.predict(full_df)

    assert len(results) == 20
    outlier_res = results[-1]
    assert outlier_res.peak_id == "PK-020-OUTLIER"
    assert outlier_res.anomaly_score > 0.7
    assert outlier_res.is_anomaly is True


def test_index_alignment_after_dedup():
    """
    Regression test for FIX R3-2:
    Non-contiguous DataFrame index must not shift positional mapping.
    """
    df = pd.DataFrame({
        "peak_id": [f"P{i}" for i in range(10)],
        "retention_time": [float(i) for i in range(10)],
        "peak_area": [1000.0 * (i + 1) for i in range(10)],
        "peak_height": [100.0 * (i + 1) for i in range(10)],
        "intensity": [105.0 * (i + 1) for i in range(10)],
        "concentration": [0.01 * (i + 1) for i in range(10)],
    })
    # Drop rows 2, 4, 7 leaving gaps in index: [0, 1, 3, 5, 6, 8, 9]
    df_with_gaps = df.drop(index=[2, 4, 7])
    assert list(df_with_gaps.index) != list(range(len(df_with_gaps)))

    settings = Settings(ml_contamination="0.1", ml_random_state=42)
    detector = IsolationForestDetector(settings)
    results = detector.predict(df_with_gaps)

    assert len(results) == 7
    expected_pids = [f"P{i}" for i in [0, 1, 3, 5, 6, 8, 9]]
    for idx, r in enumerate(results):
        assert r.peak_id == expected_pids[idx]
        assert r.retention_time == float(expected_pids[idx][1:])
