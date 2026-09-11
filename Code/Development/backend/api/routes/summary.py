import logging
from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId
from api.dependencies import get_llm_router
from services.llm.router import LLMRouter
from services.llm.prompt_builder import PromptBuilder, SYSTEM_PROMPT
from services.graph.queries import get_analysis_context
from services.graph.writer import write_interpretation
from db.models.analysis import Analysis
from config import get_settings

logger = logging.getLogger("nexusmind.api.summary")

router = APIRouter(tags=["AI Summary"])


@router.post("/summary/{analysis_id}")
async def generate_summary(
    analysis_id: str,
    llm_router: LLMRouter = Depends(get_llm_router),
):
    try:
        obj_id = PydanticObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid analysis_id format.")

    analysis = await Analysis.get(obj_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    # 1. Fetch KG context
    try:
        kg_context = await get_analysis_context(analysis_id)
    except Exception as e:
        logger.warning(f"Failed to fetch live KG context: {e}")
        kg_context = analysis.kg_context or {}

    # 2. Build structured user message payload
    user_payload = PromptBuilder.build_payload(
        kpis=analysis.kpis,
        peaks=analysis.peak_details,
        anomalies=analysis.anomaly_results,
        kg_context=kg_context,
    )

    # 3. Call LLM Router
    raw_response = await llm_router.complete(SYSTEM_PROMPT, user_payload)

    # 4. Parse response
    interpretation, summary_dict = PromptBuilder.parse_response(raw_response)

    # 5. Persist to MongoDB
    analysis.ai_interpretation = interpretation
    analysis.ai_summary = summary_dict
    await analysis.save()

    # 6. Write to Neo4j
    settings = get_settings()
    model_used = settings.groq_model if settings.groq_api_key else settings.openrouter_model
    try:
        await write_interpretation(str(analysis.id), interpretation, model_used)
    except Exception as e:
        logger.warning(f"Failed to write interpretation to Neo4j: {e}")

    return {
        "analysis_id": str(analysis.id),
        "interpretation": interpretation,
        "summary": summary_dict,
    }
