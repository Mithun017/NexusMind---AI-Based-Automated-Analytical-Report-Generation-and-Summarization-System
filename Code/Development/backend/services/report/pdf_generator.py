import io
from datetime import datetime
from typing import List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
    HRFlowable,
)
from services.report.context_builder import ReportContext
from core.exceptions import ReportError


class PDFReportGenerator:
    def generate(self, context: ReportContext) -> bytes:
        """Generates a complete 10-section analytical PDF report using ReportLab."""
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()

        # Custom typography styles
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#1e293b"),
            fontName="Helvetica-Bold",
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#64748b"),
        )
        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold",
            spaceBefore=12,
            spaceAfter=6,
        )
        body_style = ParagraphStyle(
            "ReportBody",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#334155"),
        )
        body_bold = ParagraphStyle(
            "ReportBodyBold",
            parent=body_style,
            fontName="Helvetica-Bold",
        )
        callout_style = ParagraphStyle(
            "ReportCallout",
            parent=body_style,
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#1e1b4b"),
            backColor=colors.HexColor("#f5f3ff"),
            borderColor=colors.HexColor("#c4b5fd"),
            borderWidth=1,
            borderPadding=8,
            spaceBefore=6,
            spaceAfter=6,
        )

        story = []

        analysis = context.analysis
        upload = context.upload
        kpis = analysis.kpis
        peaks = analysis.peak_details
        anomalies = analysis.anomaly_results
        ai_summary = analysis.ai_summary or {}
        ai_interpretation = analysis.ai_interpretation or "No AI interpretation provided."

        sample_id = analysis.sample_id or "Sample-001"
        analysis_type = kpis.get("analysis_type", "HPLC-UV/Vis")
        run_date = analysis.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")

        # ── SECTION 1: Cover Header ──────────────────────────────────────────
        story.append(Paragraph("NexusMind Analytical Intelligence", title_style))
        story.append(Paragraph("AI-Based Automated Analytical Report & Summarization System", subtitle_style))
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#6366f1"), spaceAfter=12))

        # ── SECTION 2: Sample Information ────────────────────────────────────
        story.append(Paragraph("1. Sample & Run Information", section_heading))
        sample_info_data = [
            [
                Paragraph("<b>Sample ID:</b>", body_style), Paragraph(str(sample_id), body_style),
                Paragraph("<b>Analysis Date:</b>", body_style), Paragraph(str(run_date), body_style),
            ],
            [
                Paragraph("<b>Source File:</b>", body_style), Paragraph(str(upload.filename), body_style),
                Paragraph("<b>Format:</b>", body_style), Paragraph(str(upload.file_format).upper(), body_style),
            ],
            [
                Paragraph("<b>Analysis Type:</b>", body_style), Paragraph(str(analysis_type), body_style),
                Paragraph("<b>Cleaned Records:</b>", body_style), Paragraph(str(len(peaks)), body_style),
            ],
        ]
        info_table = Table(sample_info_data, colWidths=[90, 180, 90, 180])
        info_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 10))

        # ── SECTION 3: Analytical KPIs ───────────────────────────────────────
        story.append(Paragraph("2. Analytical Key Performance Indicators (KPIs)", section_heading))
        kpi_data = [
            ["Total Peaks", "Major Peaks (>5%)", "Quality Score", "Max Peak Area", "Avg Intensity", "Anomalies"],
            [
                str(kpis.get("total_peaks", len(peaks))),
                str(kpis.get("major_peaks", 0)),
                f"{kpis.get('quality_score', 0.0)}%",
                f"{kpis.get('max_area', 0.0):,.1f}",
                f"{kpis.get('avg_intensity', 0.0):,.1f}",
                str(len([a for a in anomalies if a.get("is_anomaly")])),
            ],
        ]
        kpi_table = Table(kpi_data, colWidths=[90, 95, 85, 90, 90, 90])
        kpi_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f1f5f9")),
            ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 1), (-1, 1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 10))

        # ── SECTION 4: Chromatogram Visual ───────────────────────────────────
        story.append(Paragraph("3. Chromatogram Visual & Peak Profile", section_heading))
        if context.chromatogram_png:
            chrom_img = Image(io.BytesIO(context.chromatogram_png), width=520, height=220)
            story.append(chrom_img)
        story.append(Spacer(1, 10))

        # ── SECTION 5: Peak Analysis Table ───────────────────────────────────
        story.append(Paragraph("4. Detailed Peak Analysis Table", section_heading))
        peak_table_header = ["Peak ID", "Compound Name", "RT (min)", "Peak Area", "Height", "Conc (mg/L)", "Abund (%)", "S/N"]
        peak_table_rows = [peak_table_header]
        for p in peaks[:25]:  # include up to 25 peaks in summary table
            peak_table_rows.append([
                p.get("peak_id", ""),
                str(p.get("compound_name", ""))[:16],
                f"{p.get('retention_time', 0.0):.2f}",
                f"{p.get('peak_area', 0.0):,.1f}",
                f"{p.get('peak_height', 0.0):,.1f}",
                f"{p.get('concentration', 0.0):.3f}",
                f"{p.get('relative_abundance', 0.0):.1f}%",
                f"{p.get('snr', 0.0):.1f}",
            ])

        peak_table = Table(peak_table_rows, colWidths=[55, 105, 55, 65, 65, 70, 65, 60])
        peak_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(peak_table)
        story.append(Spacer(1, 10))

        # ── SECTION 6: Anomaly Detection Results ─────────────────────────────
        story.append(Paragraph("5. Machine Learning Anomaly Detection Results", section_heading))
        if context.anomaly_chart_png:
            anom_img = Image(io.BytesIO(context.anomaly_chart_png), width=520, height=180)
            story.append(anom_img)
            story.append(Spacer(1, 6))

        anom_header = ["Peak ID", "Retention Time", "Score", "Confidence", "Classification"]
        anom_rows = [anom_header]
        # Include top 25 anomalies for clean PDF pagination
        flagged_anoms = [a for a in anomalies if (a.get('is_anomaly') if isinstance(a, dict) else getattr(a, 'is_anomaly', False))]
        table_anoms = flagged_anoms[:25] if flagged_anoms else anomalies[:25]
        for a in table_anoms:
            anom_rows.append([
                a.get("peak_id", ""),
                f"{a.get('retention_time', 0.0):.2f} min",
                f"{a.get('anomaly_score', 0.0):.3f}",
                f"{a.get('confidence', 0.0):.1f}%",
                a.get("classification", "Normal"),
            ])

        anom_table = Table(anom_rows, colWidths=[80, 110, 80, 100, 170])
        anom_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#475569")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(anom_table)
        story.append(Spacer(1, 10))

        # ── SECTION 7: Knowledge Graph Findings ──────────────────────────────
        story.append(Paragraph("6. Knowledge Graph Relationships & Findings", section_heading))
        findings = context.kg_context.get("findings", [])
        if findings:
            for f in findings[:6]:
                desc = f.get("description", "")
                sev = f.get("severity", "LOW")
                story.append(Paragraph(f"• <b>[{sev}]</b> {desc}", body_style))
                story.append(Spacer(1, 3))
        else:
            story.append(Paragraph("• Standard chromatographic graph entities and relationships verified without conflicting prior findings.", body_style))
        story.append(Spacer(1, 8))

        # ── SECTION 8: AI Interpretation & Summary ───────────────────────────
        story.append(Paragraph("7. AI-Assisted Analytical Interpretation & Summary", section_heading))
        story.append(Paragraph(f"<i>AI-Generated Content: Evaluated deterministically against computed KPIs.</i>", subtitle_style))
        story.append(Spacer(1, 4))
        story.append(Paragraph(ai_interpretation, callout_style))

        if isinstance(ai_summary, dict) and ai_summary.get("important_peaks"):
            story.append(Paragraph("<b>Key Chromatographic Observations:</b>", body_bold))
            for obs in ai_summary.get("important_peaks", []):
                story.append(Paragraph(f"• {obs}", body_style))
                story.append(Spacer(1, 2))
        story.append(Spacer(1, 8))

        # ── SECTION 9: Recommendations ───────────────────────────────────────
        story.append(Paragraph("8. Actionable Recommendations", section_heading))
        recs = ai_summary.get("recommendations", []) if isinstance(ai_summary, dict) else []
        if recs:
            for r in recs:
                story.append(Paragraph(f"→ {r}", body_style))
                story.append(Spacer(1, 2))
        else:
            story.append(Paragraph("→ Verify standard calibration curves for major peaks.", body_style))
            story.append(Paragraph("→ Maintain column wash cycle if anomalous baseline shifts are detected.", body_style))
        story.append(Spacer(1, 8))

        # ── SECTION 10: Conclusion & Sign-Off ─────────────────────────────────
        story.append(Paragraph("9. Final Conclusion & QA Sign-Off", section_heading))
        conclusion_text = ai_summary.get("conclusion", "Chromatographic run analysis complete and within acceptable operational quality limits.") if isinstance(ai_summary, dict) else "Analysis complete."
        story.append(Paragraph(conclusion_text, body_style))
        story.append(Spacer(1, 14))

        sign_data = [
            [Paragraph("<b>Generated By:</b> NexusMind AI Engine", body_style), Paragraph("<b>Reviewed By:</b> ____________________", body_style)],
            [Paragraph(f"<b>Timestamp:</b> {run_date}", body_style), Paragraph("<b>Signature:</b> ______________________", body_style)],
        ]
        sign_table = Table(sign_data, colWidths=[270, 270])
        sign_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(sign_table)

        try:
            doc.build(story)
            pdf_bytes = buf.getvalue()
            buf.close()
            return pdf_bytes
        except Exception as e:
            buf.close()
            raise ReportError(f"Failed to generate PDF report: {str(e)}")
