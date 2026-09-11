from .health import router as health_router
from .upload import router as upload_router
from .analysis import router as analysis_router
from .kpi import router as kpi_router
from .anomaly import router as anomaly_router
from .graph import router as graph_router
from .summary import router as summary_router
from .report import router as report_router
from .history import router as history_router

__all__ = [
    "health_router",
    "upload_router",
    "analysis_router",
    "kpi_router",
    "anomaly_router",
    "graph_router",
    "summary_router",
    "report_router",
    "history_router",
]
