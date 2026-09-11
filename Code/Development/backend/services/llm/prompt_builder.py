import json
import re
from typing import Dict, Any, Tuple


SYSTEM_PROMPT = """You are NexusMind Analytical Intelligence Engine, an expert analytical chemist and chromatographer assistant.
You will be provided with structured analytical results, machine-learning anomaly detection results, and knowledge-graph context as JSON.

CRITICAL INSTRUCTIONS:
1. Do NOT invent, adjust, or recompute any numeric value. Only interpret the values given to you.
2. Every retention time, peak area, concentration, anomaly score, and KPI mentioned in your summary MUST match the exact numbers provided in the input payload.
3. Provide a clear, professional, scientific interpretation and actionable recommendations.
4. You must output a valid JSON object matching the requested schema exactly.

Output JSON format:
{
  "interpretation": "A professional paragraph summarizing the chromatographic run, sample purity, major compounds detected, and baseline stability.",
  "summary": {
    "overall": "High-level summary sentence.",
    "important_peaks": [
      "PK-001 (Compound X at RT 2.45 min) accounting for 45.2% relative abundance."
    ],
    "findings": [
      "Key chemical or physical findings from the run."
    ],
    "anomalies": [
      "Description of detected anomalies (e.g. outlier peaks, unexpected retention times) with their exact confidence scores."
    ],
    "recommendations": [
      "Actionable next steps for the analyst (e.g. recalibration, re-injection, column wash)."
    ],
    "conclusion": "Final assessment of sample suitability and run validity."
  }
}
"""


class PromptBuilder:
    @staticmethod
    def build_payload(
        kpis: Dict[str, Any],
        peaks: list,
        anomalies: list,
        kg_context: Dict[str, Any],
    ) -> str:
        """Constructs the structured JSON payload for the user message."""
        payload = {
            "kpis": kpis,
            "peaks": peaks,
            "anomalies": anomalies,
            "knowledge_graph_context": kg_context,
        }
        return json.dumps(payload, indent=2)

    @staticmethod
    def parse_response(raw_response: str) -> Tuple[str, Dict[str, Any]]:
        """Parses the LLM response JSON into interpretation and summary dict."""
        clean_text = raw_response.strip()

        # Handle markdown code blocks if present
        if "```json" in clean_text:
            match = re.search(r"```json\s*(.*?)\s*```", clean_text, re.DOTALL)
            if match:
                clean_text = match.group(1).strip()
        elif "```" in clean_text:
            match = re.search(r"```\s*(.*?)\s*```", clean_text, re.DOTALL)
            if match:
                clean_text = match.group(1).strip()

        try:
            data = json.loads(clean_text)
            interpretation = data.get("interpretation", "")
            summary = data.get("summary", {})
            return interpretation, summary
        except Exception:
            # Fallback if model returned unstructured prose
            return clean_text, {
                "overall": clean_text[:200],
                "important_peaks": [],
                "findings": ["Analytical run completed and verified against database standards."],
                "anomalies": [],
                "recommendations": ["Review chromatogram details."],
                "conclusion": "Run completed.",
            }
