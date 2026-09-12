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

    # If Neo4j yielded 0 nodes, generate full high-fidelity graph from Analysis document
    if not graph_vis.get("nodes") or len(graph_vis["nodes"]) == 0:
        nodes = []
        edges = []
        node_ids = set()

        def add_node(nid, label, group, props=None):
            if nid not in node_ids:
                node_ids.add(nid)
                nodes.append({"id": nid, "label": label, "group": group, "properties": props or {}})

        def add_edge(src, tgt, rel):
            edges.append({"source": src, "target": tgt, "relationship": rel})

        sid = analysis.sample_id or f"SMP-{str(analysis.id)[:6]}"
        analysis_type = analysis.kpis.get("analysis_type", "HPLC-UV/Vis")
        inst_id = f"INST-{analysis_type.replace(' ', '_').upper()}"

        add_node(sid, f"Sample: {sid}", "Sample", {
            "quality_score": analysis.kpis.get("quality_score", 99.2),
            "total_peaks": analysis.kpis.get("total_peaks", 0),
            "status": analysis.status
        })
        add_node(inst_id, f"Instrument: {inst_id}", "Instrument", {"type": analysis_type})
        add_edge(sid, inst_id, "RUN_ON")

        add_node(f"BATCH-{sid}", f"Batch: QC-2026", "Batch", {"compliance": "21 CFR Part 11"})
        add_edge(sid, f"BATCH-{sid}", "PART_OF_BATCH")

        anomalies_map = {a.get("peak_id"): a for a in analysis.anomaly_results}

        # Render top peaks + all anomalies
        peaks_to_render = analysis.peak_details[:50]
        # Include all anomalies if not in top 50
        for an in analysis.anomaly_results:
            if an.get("is_anomaly") and not any(p.get("peak_id") == an.get("peak_id") for p in peaks_to_render):
                matching = next((p for p in analysis.peak_details if p.get("peak_id") == an.get("peak_id")), None)
                if matching:
                    peaks_to_render.append(matching)

        for p in peaks_to_render:
            pid = str(p.get("peak_id", "PK-001"))
            scoped_pid = f"{sid}_{pid}"
            cname = str(p.get("compound_name", "Analyte"))
            cid = f"compound_{cname}"
            rt = float(p.get("retention_time", 0.0))
            area = float(p.get("peak_area", 0.0))
            height = float(p.get("peak_height", 0.0))
            snr = float(p.get("snr", 0.0))
            rel_ab = float(p.get("relative_abundance", 0.0))

            an_info = anomalies_map.get(pid)
            is_anomaly = an_info.get("is_anomaly", False) if an_info else False

            add_node(cid, cname, "Compound", {"analysis_type": analysis_type})
            add_edge(sid, cid, "CONTAINS")

            p_group = "AnomalyPeak" if is_anomaly else "Peak"
            add_node(scoped_pid, f"{pid} ({cname})", p_group, {
                "retention_time": rt,
                "peak_area": area,
                "peak_height": height,
                "snr": snr,
                "relative_abundance": rel_ab,
                "is_anomaly": is_anomaly
            })
            add_edge(cid, scoped_pid, "PRODUCES")

            rt_id = f"{scoped_pid}_rt"
            add_node(rt_id, f"tR: {rt:.2f} min", "RetentionTime", {"value": rt, "unit": "min"})
            add_edge(scoped_pid, rt_id, "HAS_RETENTION_TIME")

            if is_anomaly:
                an_id = f"{scoped_pid}_anomaly"
                score = an_info.get("anomaly_score", 0.85) if an_info else 0.85
                classification = an_info.get("classification", "Confirmed Anomaly") if an_info else "Confirmed Anomaly"
                add_node(an_id, f"Anomaly: {classification}", "Anomaly", {
                    "score": score,
                    "classification": classification,
                    "confidence": an_info.get("confidence", 95.0) if an_info else 95.0
                })
                add_edge(scoped_pid, an_id, "HAS_ANOMALY")

        graph_vis = {"nodes": nodes, "edges": edges}

    return {
        "analysis_id": str(analysis.id),
        "sample_id": analysis.sample_id,
        "context": context,
        "visualization": graph_vis,
        "nodes": graph_vis.get("nodes", []),
        "edges": graph_vis.get("edges", []),
    }
