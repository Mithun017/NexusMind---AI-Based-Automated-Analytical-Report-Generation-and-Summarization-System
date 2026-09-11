import io
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
import pandas as pd
from pydantic import BaseModel
from core.exceptions import ValidationError


SUPPORTED_EXTENSIONS = {".csv", ".xlsx"}

KNOWN_MIME = {
    ".csv": {"text/csv", "application/csv", "text/plain"},
    ".xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
}

REQUIRED_COLUMNS = [
    "Sample ID",
    "Retention Time",
    "Peak Area",
    "Peak Height",
    "Intensity",
    "Concentration",
    "Compound Name",
    "Analysis Type",
]


class ValidationErrorItem(BaseModel):
    row: Optional[int] = None
    column: Optional[str] = None
    message: str


class ValidationResult(BaseModel):
    valid: bool
    errors: List[ValidationErrorItem]
    warnings: List[str]
    format: str


class FileValidator:
    def detect_format(self, filename: str, content_type: Optional[str] = None) -> Tuple[str, List[str]]:
        """
        Returns (fmt, warnings).
        fmt: 'csv' | 'xlsx' derived from file extension.
        warnings: list of soft-warning strings.
        Extension is authoritative; MIME mismatch is a soft warning.
        """
        ext = Path(filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            if ext == ".xls":
                raise ValidationError(
                    "Unsupported file type '.xls' (legacy Excel). Please use modern Excel (.xlsx) or CSV (.csv)."
                )
            raise ValidationError(
                f"Unsupported file type '{ext}'. Accepted formats are: .csv, .xlsx"
            )

        fmt = "xlsx" if ext == ".xlsx" else "csv"
        warnings: List[str] = []

        if content_type and content_type not in KNOWN_MIME.get(ext, set()):
            warnings.append(
                f"Unexpected MIME type '{content_type}' for {ext} file — processing anyway (extension takes precedence)."
            )

        return fmt, warnings

    def verify_magic_bytes(self, file_bytes: bytes, fmt: str) -> None:
        """Verify initial byte signatures for security hardening."""
        if not file_bytes:
            raise ValidationError("Uploaded file is empty (0 bytes).")

        if fmt == "xlsx":
            # XLSX files are ZIP archives starting with PK (0x50 0x4B 0x03 0x04)
            if len(file_bytes) < 4 or not file_bytes.startswith(b"PK"):
                raise ValidationError("Invalid XLSX file structure. File does not contain standard ZIP/OOXML header.")
        elif fmt == "csv":
            # CSV should be printable text or utf-8 encoded
            sample = file_bytes[:512]
            try:
                sample.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    sample.decode("latin-1")
                except Exception:
                    raise ValidationError("Invalid CSV file encoding. File contains binary or unreadable data.")

    def load_dataframe(self, file_bytes: bytes, fmt: str) -> pd.DataFrame:
        """Load DataFrame from bytes using appropriate engine."""
        self.verify_magic_bytes(file_bytes, fmt)
        try:
            if fmt == "csv":
                try:
                    return pd.read_csv(io.BytesIO(file_bytes))
                except UnicodeDecodeError:
                    return pd.read_csv(io.BytesIO(file_bytes), encoding="latin-1")
            else:
                return pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl")
        except Exception as e:
            raise ValidationError(f"Failed to parse {fmt.upper()} file: {str(e)}")

    def _check_required_columns(self, df: pd.DataFrame) -> List[ValidationErrorItem]:
        errors: List[ValidationErrorItem] = []
        missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        for col in missing_cols:
            errors.append(ValidationErrorItem(column=col, message=f"Missing required column: '{col}'"))
        return errors

    def _check_required_identifiers(self, df: pd.DataFrame) -> List[ValidationErrorItem]:
        errors: List[ValidationErrorItem] = []
        if df.empty:
            errors.append(ValidationErrorItem(message="The dataset contains no data rows."))
            return errors

        if "Sample ID" in df.columns and df["Sample ID"].dropna().empty:
            errors.append(ValidationErrorItem(column="Sample ID", message="Sample ID column cannot be entirely empty."))

        # Check for numeric validity in key fields
        numeric_cols = ["Retention Time", "Peak Area", "Peak Height", "Intensity", "Concentration"]
        for col in numeric_cols:
            if col in df.columns:
                non_null_vals = df[col].dropna()
                if not non_null_vals.empty:
                    # check if convertible to numeric
                    converted = pd.to_numeric(non_null_vals, errors="coerce")
                    invalid_count = converted.isna().sum()
                    if invalid_count > 0:
                        errors.append(
                            ValidationErrorItem(
                                column=col,
                                message=f"Column '{col}' contains {invalid_count} non-numeric value(s).",
                            )
                        )

        return errors

    def validate(self, file_bytes: bytes, filename: str, content_type: Optional[str] = None) -> ValidationResult:
        fmt, mime_warnings = self.detect_format(filename, content_type)
        df = self.load_dataframe(file_bytes, fmt)
        errors = self._check_required_columns(df)
        if not errors:
            errors += self._check_required_identifiers(df)

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=mime_warnings,
            format=fmt,
        )
