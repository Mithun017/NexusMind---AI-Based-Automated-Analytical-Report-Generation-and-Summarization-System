import math
from fastapi import APIRouter, Query
from db.models.analysis import Analysis
from db.models.upload import Upload
from db.models.report import Report

router = APIRouter(tags=["History"])


@router.get("/history")
async def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    skip = (page - 1) * limit
    total = await Analysis.count()
    analyses = await Analysis.find().sort("-created_at").skip(skip).limit(limit).to_list()

    items = []
    for a in analyses:
        upload = await Upload.get(a.upload_id)
        report = await Report.find_one(Report.analysis_id == a.id)

        items.append({
            "analysis_id": str(a.id),
            "upload_id": str(a.upload_id),
            "sample_id": a.sample_id,
            "filename": upload.filename if upload else "unknown",
            "file_format": upload.file_format if upload else "csv",
            "status": a.status,
            "created_at": a.created_at,
            "kpis": a.kpis,
            "has_report": report is not None,
            "report_id": str(report.id) if report else None,
        })

    pages = math.ceil(total / limit) if total > 0 else 1

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }
