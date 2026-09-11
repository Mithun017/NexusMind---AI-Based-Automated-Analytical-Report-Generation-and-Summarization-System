import pandas as pd
from pathlib import Path
from services.preprocessing.preprocessor import Preprocessor
from services.analytical.engine import AnalyticalEngine

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "sample_analytical.csv"


def test_analytical_engine_determinism():
    raw_df = pd.read_csv(FIXTURE_PATH)
    preprocessor = Preprocessor()
    clean_df, _ = preprocessor.process(raw_df)

    engine = AnalyticalEngine()
    res1 = engine.analyze(clean_df)
    res2 = engine.analyze(clean_df)

    # Determinism across runs
    assert res1.total_peaks == res2.total_peaks == 8
    assert res1.major_peaks == res2.major_peaks
    assert res1.max_area == res2.max_area == 89200.8
    assert res1.quality_score == res2.quality_score
    assert len(res1.peak_details) == 8

    # Quality score is valid percentage
    assert 0.0 <= res1.quality_score <= 100.0

    # Peaks with relative abundance > 5.0%
    expected_major = sum(1 for p in res1.peak_details if p.relative_abundance > 5.0)
    assert res1.major_peaks == expected_major
