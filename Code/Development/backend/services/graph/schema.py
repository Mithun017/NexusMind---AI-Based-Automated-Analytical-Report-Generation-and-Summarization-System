import logging
from db.neo4j_client import get_neo4j_driver

logger = logging.getLogger("nexusmind.graph.schema")

CONSTRAINTS = [
    "CREATE CONSTRAINT sample_id_unique IF NOT EXISTS FOR (s:Sample) REQUIRE s.sample_id IS UNIQUE",
    "CREATE CONSTRAINT compound_name_unique IF NOT EXISTS FOR (c:Compound) REQUIRE c.name IS UNIQUE",
    "CREATE CONSTRAINT peak_id_unique IF NOT EXISTS FOR (p:Peak) REQUIRE p.peak_id IS UNIQUE",
    "CREATE CONSTRAINT instrument_id_unique IF NOT EXISTS FOR (i:Instrument) REQUIRE i.instrument_id IS UNIQUE",
    "CREATE CONSTRAINT analysis_type_unique IF NOT EXISTS FOR (at:AnalysisType) REQUIRE at.name IS UNIQUE",
    "CREATE CONSTRAINT finding_id_unique IF NOT EXISTS FOR (f:Finding) REQUIRE f.finding_id IS UNIQUE",
    "CREATE CONSTRAINT anomaly_id_unique IF NOT EXISTS FOR (an:Anomaly) REQUIRE an.anomaly_id IS UNIQUE",
    "CREATE CONSTRAINT interpretation_id_unique IF NOT EXISTS FOR (ip:Interpretation) REQUIRE ip.interpretation_id IS UNIQUE",
]


async def init_graph_schema():
    driver = get_neo4j_driver()
    async with driver.session() as session:
        for query in CONSTRAINTS:
            try:
                await session.run(query)
            except Exception as e:
                logger.warning(f"Error executing schema constraint '{query}': {e}")
    logger.info("Neo4j schema constraints initialized.")
