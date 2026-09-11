from functools import lru_cache
from config import Settings, get_settings
from services.storage.local import LocalStorageBackend
from services.validation.validator import FileValidator
from services.preprocessing.preprocessor import Preprocessor
from services.analytical.engine import AnalyticalEngine
from services.ml.isolation_forest import IsolationForestDetector
from services.llm.groq_provider import GroqProvider
from services.llm.openrouter_provider import OpenRouterProvider
from services.llm.router import LLMRouter
from services.report.context_builder import ReportContextBuilder
from services.report.pdf_generator import PDFReportGenerator


@lru_cache()
def get_storage_backend() -> LocalStorageBackend:
    settings = get_settings()
    return LocalStorageBackend(settings.uploads_dir)


@lru_cache()
def get_reports_storage() -> LocalStorageBackend:
    settings = get_settings()
    return LocalStorageBackend(settings.reports_dir)


@lru_cache()
def get_file_validator() -> FileValidator:
    return FileValidator()


@lru_cache()
def get_preprocessor() -> Preprocessor:
    return Preprocessor(get_settings())


@lru_cache()
def get_analytical_engine() -> AnalyticalEngine:
    return AnalyticalEngine()


@lru_cache()
def get_anomaly_detector() -> IsolationForestDetector:
    return IsolationForestDetector(get_settings())


@lru_cache()
def get_llm_router() -> LLMRouter:
    settings = get_settings()
    providers = []
    # Primary: Groq
    providers.append(GroqProvider(settings))
    # Fallback: OpenRouter
    providers.append(OpenRouterProvider(settings))
    return LLMRouter(providers)


@lru_cache()
def get_report_context_builder() -> ReportContextBuilder:
    return ReportContextBuilder()


@lru_cache()
def get_pdf_generator() -> PDFReportGenerator:
    return PDFReportGenerator()
