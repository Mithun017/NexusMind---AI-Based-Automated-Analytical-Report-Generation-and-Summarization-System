import json
import pytest
from services.llm.base import LLMProvider
from services.llm.router import LLMRouter
from services.llm.prompt_builder import PromptBuilder, SYSTEM_PROMPT
from core.exceptions import LLMProviderError


class MockSuccessProvider(LLMProvider):
    def __init__(self, name: str = "MockSuccess"):
        self.name = name
        self.last_system_prompt = None
        self.last_user_message = None

    async def complete(self, system_prompt: str, user_message: str) -> str:
        self.last_system_prompt = system_prompt
        self.last_user_message = user_message
        return json.dumps({
            "interpretation": "Standard run completed with 8 identified peaks.",
            "summary": {
                "overall": "Run successful.",
                "important_peaks": ["PK-001 (Uracil) at 1.25 min."],
                "findings": ["Clean baseline."],
                "anomalies": [],
                "recommendations": ["No action required."],
                "conclusion": "Valid sample.",
            }
        })

    async def list_models(self):
        return ["mock-model-1"]


class MockFailingProvider(LLMProvider):
    async def complete(self, system_prompt: str, user_message: str) -> str:
        raise LLMProviderError("Primary provider rate-limited (429)")

    async def list_models(self):
        return []


def test_system_prompt_numeric_guard():
    assert "Do NOT invent, adjust, or recompute any numeric value" in SYSTEM_PROMPT


def test_payload_builder_structure():
    kpis = {"total_peaks": 8, "major_peaks": 3, "quality_score": 92.5}
    peaks = [{"peak_id": "PK-001", "retention_time": 1.25, "peak_area": 12450.5}]
    anomalies = [{"peak_id": "PK-001", "anomaly_score": 0.12, "is_anomaly": False}]
    kg_context = {"sample": "SMP-001", "analysis_type": "HPLC"}

    payload_str = PromptBuilder.build_payload(kpis, peaks, anomalies, kg_context)
    data = json.loads(payload_str)

    assert data["kpis"]["total_peaks"] == 8
    assert data["kpis"]["quality_score"] == 92.5
    assert data["peaks"][0]["retention_time"] == 1.25
    assert data["knowledge_graph_context"]["sample"] == "SMP-001"


@pytest.mark.asyncio
async def test_llm_router_failover():
    primary_fail = MockFailingProvider()
    secondary_success = MockSuccessProvider()

    router = LLMRouter([primary_fail, secondary_success])
    result_str = await router.complete("sys_prompt", "user_payload")

    interp, summary = PromptBuilder.parse_response(result_str)
    assert "8 identified peaks" in interp
    assert summary["overall"] == "Run successful."
