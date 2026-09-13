import logging
from typing import Optional
from neo4j import AsyncGraphDatabase, AsyncDriver
from config import Settings

logger = logging.getLogger("nexusmind.db.neo4j")

_driver: Optional[AsyncDriver] = None


async def init_neo4j(settings: Settings):
    global _driver
    logger.info(f"Connecting to Neo4j at {settings.neo4j_uri}")
    _driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
        connection_timeout=0.5,
        max_connection_lifetime=60,
        max_connection_pool_size=50,
    )


async def close_neo4j():
    global _driver
    if _driver:
        await _driver.close()
        logger.info("Neo4j driver closed.")


def get_neo4j_driver() -> AsyncDriver:
    if _driver is None:
        raise RuntimeError("Neo4j driver has not been initialized.")
    return _driver


async def ping_neo4j() -> bool:
    global _driver
    if _driver is None:
        return False
    try:
        async with _driver.session() as session:
            result = await session.run("RETURN 1 AS num")
            record = await result.single()
            return record is not None and record["num"] == 1
    except Exception:
        return False
