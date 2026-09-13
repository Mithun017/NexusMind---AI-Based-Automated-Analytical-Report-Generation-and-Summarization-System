import logging
from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId
from api.dependencies import (
    get_storage_backend,
    get_file_validator,
    get_preprocessor,
    get_analytical_engine,
    get_anomaly_detector,
)
from services.storage.local import LocalStorageBackend
from services.validation.validator import FileValidator
from services.preprocessing.preprocessor import Preprocessor
from services.analytical.engine import AnalyticalEngine
from services.ml.isolation_forest import IsolationForestDetector
from services.graph.writer import write_analysis_entities
from db.models.upload import Upload
from db.models.sample import Sample
from db.models.analysis import Analysis
from core.exceptions import AnalysisError

logger = logging.getLogger("nexusmind.api.analysis")

router = APIRouter(tags=["Analysis"])


@router.post("/analyze/{upload_id}", status_code=status.HTTP_201_CREATED)
async def run_analysis(
    upload_id: str,
    storage: LocalStorageBackend = Depends(get_storage_backend),
    validator: FileValidator = Depends(get_file_validator),
    preprocessor: Preprocessor = Depends(get_preprocessor),
    analytical_engine: AnalyticalEngine = Depends(get_analytical_engine),
    anomaly_detector: IsolationForestDetector = Depends(get_anomaly_detector),
):
    # Verify Upload exists
    try:
        obj_id = PydanticObjectId(upload_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid upload_id format.")

    upload_doc = await Upload.get(obj_id)
    if not upload_doc:
        raise HTTPException(status_code=404, detail="Upload record not found.")

    # Load file bytes
    file_bytes = await storage.load(upload_doc.storage_path)

    # 1. Parse raw DataFrame
    raw_df = validator.load_dataframe(file_bytes, upload_doc.file_format)

    # 2. Preprocess into canonical schema
    canonical_df, prep_meta = preprocessor.process(raw_df)

    # Create/record Sample document
    sample_id = prep_meta["sample_id"]
    sample_doc = Sample(
        sample_id=sample_id,
        upload_id=upload_doc.id,
        analysis_type=prep_meta["analysis_type"],
        raw_record_count=prep_meta["raw_record_count"],
        cleaned_record_count=prep_meta["cleaned_record_count"],
    )
    await sample_doc.insert()

    # 3. Analytical Engine
    analytical_res = analytical_engine.analyze(canonical_df)

    # 4. ML Anomaly Detection
    anomaly_res = anomaly_detector.predict(canonical_df)

    # 5. Persist Analysis document
    kpis_dict = {
        "total_peaks": analytical_res.total_peaks,
        "major_peaks": analytical_res.major_peaks,
        "quality_score": analytical_res.quality_score,
        "max_area": analytical_res.max_area,
        "avg_intensity": analytical_res.avg_intensity,
        "total_area": analytical_res.total_area,
        "anomalies_count": len([a for a in anomaly_res if (a.is_anomaly if hasattr(a, 'is_anomaly') else a.get('is_anomaly', False))]),
        "analysis_type": prep_meta["analysis_type"],
    }

    analysis_doc = Analysis(
        upload_id=upload_doc.id,
        sample_id=sample_id,
        status="complete",
        kpis=kpis_dict,
        peak_details=analytical_res.peak_details,
        anomaly_results=anomaly_res,
        kg_context={"sample_id": sample_id, "analysis_type": prep_meta["analysis_type"]},
    )
    await analysis_doc.insert()

    # 6. Write Knowledge Graph entities (Neo4j)
    try:
        await write_analysis_entities(analysis_doc)
    except Exception as e:
        logger.warning(f"Neo4j graph write warning for analysis {analysis_doc.id}: {e}")

    # Update upload status
    upload_doc.status = "processed"
    await upload_doc.save()

    return {
        "analysis_id": str(analysis_doc.id),
        "upload_id": str(upload_doc.id),
        "sample_id": sample_id,
        "status": analysis_doc.status,
        "kpis": analysis_doc.kpis,
        "total_peaks": len(analysis_doc.peak_details),
        "anomalies_flagged": kpis_dict["anomalies_count"],
        "created_at": analysis_doc.created_at,
    }


@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    try:
        obj_id = PydanticObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid analysis_id format.")

    doc = await Analysis.get(obj_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis record not found.")

    return {
        "id": str(doc.id),
        "analysis_id": str(doc.id),
        "upload_id": str(doc.upload_id),
        "sample_id": doc.sample_id,
        "status": doc.status,
        "kpis": doc.kpis,
        "peak_details": doc.peak_details,
        "anomaly_results": doc.anomaly_results,
        "ai_summary": doc.ai_summary,
        "ai_interpretation": doc.ai_interpretation,
        "created_at": doc.created_at,
    }
