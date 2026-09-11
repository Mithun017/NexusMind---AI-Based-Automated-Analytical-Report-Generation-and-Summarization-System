import io
import pytest
import pandas as pd
from pathlib import Path
from services.validation.validator import FileValidator, ValidationError
from core.exceptions import ValidationError as NexusValidationError

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "sample_analytical.csv"


def test_validate_csv_success():
    validator = FileValidator()
    with open(FIXTURE_PATH, "rb") as f:
        file_bytes = f.read()

    res = validator.validate(file_bytes, "sample_analytical.csv", "text/csv")
    assert res.valid is True
    assert res.format == "csv"
    assert len(res.errors) == 0


def test_validate_xlsx_success():
    validator = FileValidator()
    df = pd.read_csv(FIXTURE_PATH)
    out = io.BytesIO()
    df.to_excel(out, index=False, engine="openpyxl")
    file_bytes = out.getvalue()

    res = validator.validate(
        file_bytes,
        "sample.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    assert res.valid is True
    assert res.format == "xlsx"
    assert len(res.errors) == 0


def test_reject_xls_format():
    validator = FileValidator()
    with pytest.raises(NexusValidationError) as exc:
        validator.validate(b"fakecontent", "sample.xls", "application/vnd.ms-excel")
    assert ".xls" in str(exc.value)


def test_missing_required_column():
    validator = FileValidator()
    df = pd.DataFrame({
        "Sample ID": ["SMP-001"],
        "Retention Time": [1.25],
        # Missing Peak Area, Peak Height, Intensity, etc.
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    res = validator.validate(csv_bytes, "invalid.csv", "text/csv")
    assert res.valid is False
    assert len(res.errors) > 0
    missing_col_names = [e.column for e in res.errors]
    assert "Peak Area" in missing_col_names


def test_mime_warning_non_blocking():
    validator = FileValidator()
    with open(FIXTURE_PATH, "rb") as f:
        file_bytes = f.read()

    # Pass unexpected MIME type like application/octet-stream
    res = validator.validate(file_bytes, "sample_analytical.csv", "application/octet-stream")
    assert res.valid is True
    assert len(res.warnings) > 0
