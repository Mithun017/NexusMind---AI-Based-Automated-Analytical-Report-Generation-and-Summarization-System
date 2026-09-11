import logging
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from config import Settings
from db.models.upload import Upload
from db.models.sample import Sample
from db.models.analysis import Analysis
from db.models.report import Report

logger = logging.getLogger("nexusmind.db.mongodb")

client: AsyncIOMotorClient = None
db = None


async def init_mongodb(settings: Settings):
    global client, db
    logger.info(f"Connecting to MongoDB at {settings.mongo_uri} (db: {settings.mongo_db_name})")
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db_name]

    # Initialize Beanie with active document models (User is excluded from active ODM registration)
    await init_beanie(
        database=db,
        document_models=[Upload, Sample, Analysis, Report],
    )

    # Ensure required indexes
    try:
        await Upload.get_motor_collection().create_index("filename")
        await Analysis.get_motor_collection().create_index("upload_id")
        await Analysis.get_motor_collection().create_index("sample_id")
        await Analysis.get_motor_collection().create_index("created_at")
        await Report.get_motor_collection().create_index("analysis_id")
        logger.info("MongoDB initialized with collections and indexes.")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")


async def close_mongodb():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")


async def ping_mongodb() -> bool:
    global client, db
    if db is None:
        return False
    try:
        res = await db.command("ping")
        return res.get("ok") == 1.0
    except Exception as e:
        logger.error(f"MongoDB ping failed: {e}")
        return False
