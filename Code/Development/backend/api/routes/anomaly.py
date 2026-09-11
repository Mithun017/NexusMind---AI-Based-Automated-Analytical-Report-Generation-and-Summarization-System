from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
from db.models.analysis import Analysis

router = APIRouter(tags=["Anomaly"])


@router.get("/anomaly/{analysis_id}")
async def get_anomalies(analysis_id: str):
    try:
        obj_id = PydanticObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid analysis_id format.")

    analysis = await Analysis.get(obj_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    return {
        "analysis_id": str(analysis.id),
        "sample_id": analysis.sample_id,
        "anomalies": analysis.anomaly_results,
    }
