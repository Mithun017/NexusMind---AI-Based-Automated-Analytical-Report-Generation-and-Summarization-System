from fastapi import APIRouter, Depends, HTTPException, Response, status
from beanie import PydanticObjectId
from api.dependencies import (
    get_reports_storage,
    get_report_context_builder,
    get_pdf_generator,
)
from services.storage.local import LocalStorageBackend
from services.report.context_builder import ReportContextBuilder
from services.report.pdf_generator import PDFReportGenerator
from db.models.analysis import Analysis
from db.models.upload import Upload
from db.models.report import Report

router = APIRouter(tags=["Report"])


@router.post("/report/{analysis_id}", status_code=status.HTTP_201_CREATED)
async def generate_report(
    analysis_id: str,
    reports_storage: LocalStorageBackend = Depends(get_reports_storage),
    context_builder: ReportContextBuilder = Depends(get_report_context_builder),
    pdf_generator: PDFReportGenerator = Depends(get_pdf_generator),
):
    try:
        obj_id = PydanticObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid analysis_id format.")

    analysis = await Analysis.get(obj_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis record not found.")

    upload = await Upload.get(analysis.upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Associated upload record not found.")

    # Build context and render PDF
    context = await context_builder.build(analysis, upload)
    pdf_bytes = pdf_generator.generate(context)

    # Save PDF to storage
    sample_tag = (analysis.sample_id or "sample").replace(" ", "_")
    filename = f"NexusMind_Report_{sample_tag}_{str(analysis.id)[:6]}.pdf"
    storage_path = await reports_storage.save(pdf_bytes, filename)

    # Create Report document
    report_doc = Report(
        analysis_id=analysis.id,
        storage_path=storage_path,
        filename=filename,
        page_count=3,
    )
    await report_doc.insert()

    return {
        "report_id": str(report_doc.id),
        "analysis_id": str(analysis.id),
        "filename": report_doc.filename,
        "storage_path": report_doc.storage_path,
        "generated_at": report_doc.generated_at,
        "page_count": report_doc.page_count,
    }


@router.get("/report/{report_id}/download")
async def download_report(
    report_id: str,
    reports_storage: LocalStorageBackend = Depends(get_reports_storage),
):
    try:
        obj_id = PydanticObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report_id format.")

    report_doc = await Report.get(obj_id)
    if not report_doc:
        raise HTTPException(status_code=404, detail="Report not found.")

    pdf_bytes = await reports_storage.load(report_doc.storage_path)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={report_doc.filename}",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/report/by-analysis/{analysis_id}")
async def get_report_by_analysis(analysis_id: str):
    try:
        obj_id = PydanticObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid analysis_id format.")

    report_doc = await Report.find_one(Report.analysis_id == obj_id)
    if not report_doc:
        return {"has_report": False, "report": None}

    return {
        "has_report": True,
        "report": {
            "report_id": str(report_doc.id),
            "filename": report_doc.filename,
            "generated_at": report_doc.generated_at,
            "page_count": report_doc.page_count,
        },
    }
