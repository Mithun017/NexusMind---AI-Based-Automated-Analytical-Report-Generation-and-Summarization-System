import logging
from datetime import datetime
from typing import Dict, Any, List
from db.neo4j_client import get_neo4j_driver
from db.models.analysis import Analysis

logger = logging.getLogger("nexusmind.graph.writer")


async def write_analysis_entities(analysis: Analysis) -> None:
    """
    Writes all 10 entity types and their relationships to Neo4j.
    Called from POST /analyze/{upload_id} after analytical and ML pipelines complete.
    """
    driver = get_neo4j_driver()
    sample_id = analysis.sample_id or f"SMP-{str(analysis.id)[:6]}"
    mongo_id = str(analysis.id)
    analysis_type = analysis.kpis.get("analysis_type", "HPLC-UV/Vis")
    instrument_id = f"INST-{analysis_type.replace(' ', '_').upper()}"

    async with driver.session() as session:
        # 1. Sample, Instrument, AnalysisType
        await session.run(
            """
            MERGE (s:Sample {sample_id: $sample_id})
            SET s.mongo_id = $mongo_id,
                s.updated_at = datetime()
            MERGE (i:Instrument {instrument_id: $instrument_id})
            SET i.name = $instrument_id,
                i.type = $analysis_type
            MERGE (at:AnalysisType {name: $analysis_type})
            MERGE (s)-[:RUN_ON]->(i)
            """,
            sample_id=sample_id,
            mongo_id=mongo_id,
            instrument_id=instrument_id,
            analysis_type=analysis_type,
        )

        # 2. Peaks, Compounds, RetentionTime, Concentration, Findings, Anomalies
        peaks = analysis.peak_details
        anomalies_map = {a.get("peak_id"): a for a in analysis.anomaly_results}

        for peak in peaks:
            peak_id = peak.get("peak_id")
            scoped_peak_id = f"{sample_id}_{peak_id}"
            compound_name = peak.get("compound_name", "Unknown")
            rt = float(peak.get("retention_time", 0.0))
            area = float(peak.get("peak_area", 0.0))
            height = float(peak.get("peak_height", 0.0))
            conc = float(peak.get("concentration", 0.0))
            snr = float(peak.get("snr", 0.0))
            rel_abundance = float(peak.get("relative_abundance", 0.0))

            anomaly_info = anomalies_map.get(peak_id)
            is_anomaly = anomaly_info.get("is_anomaly", False) if anomaly_info else False

            finding_id = f"{scoped_peak_id}_finding"
            finding_desc = f"Peak detected at RT {rt:.2f} min with {rel_abundance:.1f}% relative abundance."
            finding_sev = "HIGH" if is_anomaly else ("MEDIUM" if rel_abundance > 20.0 else "LOW")

            # Write peak subgraph
            await session.run(
                """
                MATCH (s:Sample {sample_id: $sample_id})
                MATCH (at:AnalysisType {name: $analysis_type})
                MERGE (c:Compound {name: $compound_name})
                SET c.analysis_type_name = $analysis_type
                MERGE (s)-[:CONTAINS]->(c)
                MERGE (c)-[:PRODUCED_BY]->(at)

                MERGE (p:Peak {peak_id: $scoped_peak_id})
                SET p.raw_peak_id = $peak_id,
                    p.area = $area,
                    p.height = $height,
                    p.snr = $snr,
                    p.relative_abundance = $rel_abundance,
                    p.is_anomaly = $is_anomaly,
                    p.mongo_analysis_id = $mongo_id

                MERGE (c)-[:PRODUCES]->(p)

                CREATE (rtNode:RetentionTime {value: $rt, unit: 'min'})
                MERGE (p)-[:HAS]->(rtNode)

                CREATE (concNode:Concentration {value: $conc, unit: 'mg/L'})
                MERGE (p)-[:HAS_CONCENTRATION]->(concNode)

                MERGE (f:Finding {finding_id: $finding_id})
                SET f.description = $finding_desc,
                    f.severity = $finding_sev
                MERGE (rtNode)-[:ASSOCIATED_WITH]->(f)
                """,
                sample_id=sample_id,
                analysis_type=analysis_type,
                compound_name=compound_name,
                scoped_peak_id=scoped_peak_id,
                peak_id=peak_id,
                area=area,
                height=height,
                snr=snr,
                rel_abundance=rel_abundance,
                is_anomaly=is_anomaly,
                mongo_id=mongo_id,
                rt=rt,
                conc=conc,
                finding_id=finding_id,
                finding_desc=finding_desc,
                finding_sev=finding_sev,
            )

            # 3. Write Anomaly node if flagged
            if is_anomaly and anomaly_info:
                anomaly_id = f"{scoped_peak_id}_anomaly"
                score = float(anomaly_info.get("anomaly_score", 0.0))
                conf = float(anomaly_info.get("confidence", 0.0))
                classification = anomaly_info.get("classification", "Confirmed Anomaly")
                features_str = str(anomaly_info.get("contributing_features", {}))

                await session.run(
                    """
                    MATCH (p:Peak {peak_id: $scoped_peak_id})
                    MERGE (an:Anomaly {anomaly_id: $anomaly_id})
                    SET an.score = $score,
                        an.confidence = $confidence,
                        an.classification = $classification,
                        an.contributing_features = $features_str
                    MERGE (p)-[:HAS_ANOMALY]->(an)
                    """,
                    scoped_peak_id=scoped_peak_id,
                    anomaly_id=anomaly_id,
                    score=score,
                    confidence=conf,
                    classification=classification,
                    features_str=features_str,
                )

    logger.info(f"Successfully wrote graph entities for analysis {mongo_id}")


async def write_interpretation(analysis_id: str, interpretation_text: str, llm_model: str) -> None:
    """
    Writes Interpretation node and connects to Sample.
    Called from POST /summary/{analysis_id} (Phase 6).
    """
    driver = get_neo4j_driver()
    interpretation_id = f"INTERP-{analysis_id}"

    async with driver.session() as session:
        await session.run(
            """
            MATCH (s:Sample {mongo_id: $analysis_id})
            MERGE (ip:Interpretation {interpretation_id: $interpretation_id})
            SET ip.text = $text,
                ip.generated_at = datetime(),
                ip.llm_model = $llm_model
            MERGE (s)-[:HAS_INTERPRETATION]->(ip)
            """,
            analysis_id=str(analysis_id),
            interpretation_id=interpretation_id,
            text=interpretation_text,
            llm_model=llm_model,
        )
    logger.info(f"Interpretation written to Neo4j for analysis {analysis_id}")
