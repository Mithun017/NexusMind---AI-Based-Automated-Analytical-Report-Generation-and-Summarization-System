import logging
from typing import Dict, Any, List
from db.neo4j_client import get_neo4j_driver

logger = logging.getLogger("nexusmind.graph.queries")


async def get_analysis_context(analysis_id: str) -> Dict[str, Any]:
    """
    Retrieves structured knowledge-graph context for an analysis to feed the LLM prompt.
    """
    driver = get_neo4j_driver()
    context: Dict[str, Any] = {
        "sample": None,
        "instrument": None,
        "analysis_type": None,
        "compounds": [],
        "peaks": [],
        "findings": [],
        "anomalies": [],
        "prior_interpretations": [],
    }

    async with driver.session() as session:
        # Sample, Instrument, AnalysisType
        res = await session.run(
            """
            MATCH (s:Sample {mongo_id: $analysis_id})
            OPTIONAL MATCH (s)-[:RUN_ON]->(i:Instrument)
            OPTIONAL MATCH (s)-[:CONTAINS]->(c:Compound)-[:PRODUCED_BY]->(at:AnalysisType)
            RETURN s.sample_id AS sample_id,
                   i.name AS instrument_name,
                   i.type AS instrument_type,
                   collect(DISTINCT at.name) AS analysis_types
            """,
            analysis_id=str(analysis_id),
        )
        sample_row = await res.single()
        if sample_row:
            context["sample"] = sample_row["sample_id"]
            context["instrument"] = {
                "name": sample_row["instrument_name"],
                "type": sample_row["instrument_type"],
            }
            types = sample_row["analysis_types"]
            context["analysis_type"] = types[0] if types else "Chromatography"

        # Compounds and Peaks
        peak_res = await session.run(
            """
            MATCH (s:Sample {mongo_id: $analysis_id})-[:CONTAINS]->(c:Compound)-[:PRODUCES]->(p:Peak)
            OPTIONAL MATCH (p)-[:HAS]->(rt:RetentionTime)
            OPTIONAL MATCH (p)-[:HAS_CONCENTRATION]->(conc:Concentration)
            OPTIONAL MATCH (p)-[:HAS_ANOMALY]->(an:Anomaly)
            OPTIONAL MATCH (rt)-[:ASSOCIATED_WITH]->(f:Finding)
            RETURN c.name AS compound,
                   p.raw_peak_id AS peak_id,
                   p.area AS area,
                   p.height AS height,
                   p.snr AS snr,
                   p.relative_abundance AS rel_abundance,
                   p.is_anomaly AS is_anomaly,
                   rt.value AS rt,
                   conc.value AS conc,
                   an.score AS anomaly_score,
                   an.classification AS anomaly_classification,
                   f.description AS finding_desc,
                   f.severity AS finding_severity
            """,
            analysis_id=str(analysis_id),
        )
        records = await peak_res.data()

        seen_compounds = set()
        for r in records:
            comp = r.get("compound")
            if comp and comp not in seen_compounds:
                seen_compounds.add(comp)
                context["compounds"].append(comp)

            context["peaks"].append({
                "peak_id": r.get("peak_id"),
                "compound": r.get("compound"),
                "retention_time": r.get("rt"),
                "area": r.get("area"),
                "height": r.get("height"),
                "concentration": r.get("conc"),
                "relative_abundance": r.get("rel_abundance"),
                "snr": r.get("snr"),
                "is_anomaly": r.get("is_anomaly"),
            })

            if r.get("finding_desc"):
                context["findings"].append({
                    "description": r.get("finding_desc"),
                    "severity": r.get("finding_severity"),
                })

            if r.get("anomaly_score") is not None:
                context["anomalies"].append({
                    "peak_id": r.get("peak_id"),
                    "score": r.get("anomaly_score"),
                    "classification": r.get("anomaly_classification"),
                })

        # Interpretations
        interp_res = await session.run(
            """
            MATCH (s:Sample {mongo_id: $analysis_id})-[:HAS_INTERPRETATION]->(ip:Interpretation)
            RETURN ip.text AS text, ip.llm_model AS model, ip.generated_at AS generated_at
            """,
            analysis_id=str(analysis_id),
        )
        interp_data = await interp_res.data()
        for ip in interp_data:
            context["prior_interpretations"].append(ip)

    return context


async def get_graph_nodes_and_edges(analysis_id: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Returns nodes and edges formatted for interactive graph visualization.
    """
    driver = get_neo4j_driver()
    nodes = []
    edges = []
    node_ids = set()

    def add_node(nid: str, label: str, group: str, props: Dict[str, Any]):
        if nid not in node_ids:
            node_ids.add(nid)
            nodes.append({"id": nid, "label": label, "group": group, "properties": props})

    def add_edge(src: str, tgt: str, relationship: str):
        edges.append({"source": src, "target": tgt, "relationship": relationship})

    async with driver.session() as session:
        # Sample + Instrument
        res1 = await session.run(
            """
            MATCH (s:Sample {mongo_id: $analysis_id})
            OPTIONAL MATCH (s)-[:RUN_ON]->(i:Instrument)
            RETURN s.sample_id AS sid, i.instrument_id AS iid, i.name AS iname
            """,
            analysis_id=str(analysis_id),
        )
        data1 = await res1.data()
        for r in data1:
            sid = r["sid"]
            if sid:
                add_node(sid, f"Sample: {sid}", "Sample", {})
                if r.get("iid"):
                    iid = r["iid"]
                    add_node(iid, f"Instrument: {r.get('iname')}", "Instrument", {})
                    add_edge(sid, iid, "RUN_ON")

        # Compounds, Peaks, RT, Findings, Anomalies
        res2 = await session.run(
            """
            MATCH (s:Sample {mongo_id: $analysis_id})-[:CONTAINS]->(c:Compound)-[:PRODUCES]->(p:Peak)
            OPTIONAL MATCH (p)-[:HAS]->(rt:RetentionTime)
            OPTIONAL MATCH (rt)-[:ASSOCIATED_WITH]->(f:Finding)
            OPTIONAL MATCH (p)-[:HAS_ANOMALY]->(an:Anomaly)
            RETURN s.sample_id AS sid,
                   c.name AS cname,
                   p.peak_id AS pid,
                   p.raw_peak_id AS raw_pid,
                   p.is_anomaly AS is_anomaly,
                   rt.value AS rt_val,
                   f.finding_id AS fid,
                   f.description AS fdesc,
                   an.anomaly_id AS anid,
                   an.classification AS an_class
            """,
            analysis_id=str(analysis_id),
        )
        data2 = await res2.data()
        for r in data2:
            sid = r["sid"]
            cname = r["cname"]
            pid = r["pid"]
            raw_pid = r["raw_pid"]
            is_anomaly = r["is_anomaly"]

            cid = f"compound_{cname}"
            add_node(cid, cname, "Compound", {})
            add_edge(sid, cid, "CONTAINS")

            p_label = f"{raw_pid} ({'Anomaly' if is_anomaly else 'Normal'})"
            p_group = "AnomalyPeak" if is_anomaly else "Peak"
            add_node(pid, p_label, p_group, {"is_anomaly": is_anomaly})
            add_edge(cid, pid, "PRODUCES")

            if r.get("rt_val") is not None:
                rt_id = f"{pid}_rt"
                add_node(rt_id, f"RT: {r['rt_val']:.2f}m", "RetentionTime", {})
                add_edge(pid, rt_id, "HAS")

                if r.get("fid"):
                    fid = r["fid"]
                    add_node(fid, "Finding", "Finding", {"desc": r.get("fdesc")})
                    add_edge(rt_id, fid, "ASSOCIATED_WITH")

            if r.get("anid"):
                anid = r["anid"]
                add_node(anid, f"Anomaly: {r.get('an_class')}", "Anomaly", {})
                add_edge(pid, anid, "HAS_ANOMALY")

    return {"nodes": nodes, "edges": edges}
