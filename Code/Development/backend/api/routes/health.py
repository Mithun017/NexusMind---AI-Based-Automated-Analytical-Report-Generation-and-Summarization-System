from fastapi import APIRouter
from db.mongodb import ping_mongodb
from db.neo4j_client import ping_neo4j

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    mongo_ok = await ping_mongodb()
    neo4j_ok = await ping_neo4j()

    return {
        "status": "healthy" if (mongo_ok and neo4j_ok) else "degraded",
        "mongo": "ok" if mongo_ok else "error",
        "neo4j": "ok" if neo4j_ok else "error",
    }
