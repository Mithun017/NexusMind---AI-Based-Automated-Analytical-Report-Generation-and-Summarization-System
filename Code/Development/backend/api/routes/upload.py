from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from config import Settings, get_settings
from api.dependencies import get_storage_backend, get_file_validator
from services.storage.local import LocalStorageBackend
from services.validation.validator import FileValidator
from db.models.upload import Upload
from core.exceptions import ValidationError, StorageError

router = APIRouter(tags=["Upload"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    storage: LocalStorageBackend = Depends(get_storage_backend),
    validator: FileValidator = Depends(get_file_validator),
):
    # Read file bytes
    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Check max size constraint
    max_bytes = settings.upload_max_size_mb * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size / (1024*1024):.2f}MB) exceeds maximum limit of {settings.upload_max_size_mb}MB.",
        )

    # Run format detection & validation
    validation_res = validator.validate(
        file_bytes=file_bytes,
        filename=file.filename or "unknown",
        content_type=file.content_type,
    )

    if not validation_res.valid:
        raise ValidationError(
            message=f"Validation failed for '{file.filename}'.",
            details=[err.model_dump() for err in validation_res.errors],
        )

    # Save to storage backend
    storage_path = await storage.save(file_bytes, file.filename or "data.csv")

    # Persist upload record to MongoDB
    upload_doc = Upload(
        filename=file.filename or "data.csv",
        file_format=validation_res.format,
        storage_path=storage_path,
        status="validated",
        file_size_bytes=file_size,
        validation_report={
            "valid": True,
            "warnings": validation_res.warnings,
            "errors": [],
        },
    )
    await upload_doc.insert()

    return {
        "upload_id": str(upload_doc.id),
        "filename": upload_doc.filename,
        "file_format": upload_doc.file_format,
        "status": upload_doc.status,
        "file_size_bytes": upload_doc.file_size_bytes,
        "validation_report": upload_doc.validation_report,
    }
