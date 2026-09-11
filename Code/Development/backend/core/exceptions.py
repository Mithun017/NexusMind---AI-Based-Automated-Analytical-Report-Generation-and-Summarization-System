from typing import Any, Optional
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class NexusMindError(Exception):
    """Base exception for all domain errors in NexusMind."""
    def __init__(self, message: str, details: Optional[Any] = None, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.details = details
        self.status_code = status_code


class ValidationError(NexusMindError):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, details=details, status_code=422)


class StorageError(NexusMindError):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, details=details, status_code=500)


class AnalysisError(NexusMindError):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, details=details, status_code=400)


class MLError(NexusMindError):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, details=details, status_code=500)


class GraphError(NexusMindError):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, details=details, status_code=500)


class LLMProviderError(NexusMindError):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, details=details, status_code=502)


class ReportError(NexusMindError):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, details=details, status_code=500)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NexusMindError)
    async def nexusmind_error_handler(request: Request, exc: NexusMindError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error_code": exc.__class__.__name__,
                "message": exc.message,
                "details": exc.details,
            },
        )
