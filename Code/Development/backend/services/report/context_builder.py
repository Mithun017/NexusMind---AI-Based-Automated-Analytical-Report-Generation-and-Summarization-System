from dataclasses import dataclass
from typing import Dict, Any, Optional
from db.models.upload import Upload
from db.models.analysis import Analysis
from services.report.chart_renderer import ChartRenderer
from services.graph.queries import get_analysis_context
from core.exceptions import ReportError


@dataclass
class ReportContext:
    upload: Upload
    analysis: Analysis
    kg_context: Dict[str, Any]
    chromatogram_png: bytes
    anomaly_chart_png: bytes


class ReportContextBuilder:
    async def build(self, analysis: Analysis, upload: Upload) -> ReportContext:
        """Assembles all data and renders charts for report generation."""
        try:
            kg_context = await get_analysis_context(str(analysis.id))
        except Exception:
            kg_context = analysis.kg_context or {}

        peaks = analysis.peak_details
        anomalies = analysis.anomaly_results

        chromatogram_png = ChartRenderer.render_chromatogram(peaks, anomalies)
        anomaly_chart_png = ChartRenderer.render_anomaly_distribution(anomalies)

        return ReportContext(
            upload=upload,
            analysis=analysis,
            kg_context=kg_context,
            chromatogram_png=chromatogram_png,
            anomaly_chart_png=anomaly_chart_png,
        )
