from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
from db.models.analysis import Analysis
from services.graph.queries import get_analysis_context, get_graph_nodes_and_edges

router = APIRouter(tags=["Graph"])


@router.get("/graph/{analysis_id}")
async def get_graph(analysis_id: str):
    try:
        obj_id = PydanticObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid analysis_id format.")

    analysis = await Analysis.get(obj_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    try:
        context = await get_analysis_context(analysis_id)
        graph_vis = await get_graph_nodes_and_edges(analysis_id)
    except Exception as e:
        context = analysis.kg_context or {}
        graph_vis = {"nodes": [], "edges": []}

    return {
        "analysis_id": str(analysis.id),
        "sample_id": analysis.sample_id,
        "context": context,
        "visualization": graph_vis,
    }
