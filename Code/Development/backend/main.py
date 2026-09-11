import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from core.exceptions import register_exception_handlers
from db.mongodb import init_mongodb, close_mongodb
from db.neo4j_client import init_neo4j, close_neo4j
from services.graph.schema import init_graph_schema
from services.llm.groq_provider import GroqProvider
from services.llm.openrouter_provider import OpenRouterProvider
from api.routes import (
    health_router,
    upload_router,
    analysis_router,
    kpi_router,
    anomaly_router,
    graph_router,
    summary_router,
    report_router,
    history_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nexusmind.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Starting up NexusMind backend...")

    # 1. Ensure storage directories exist
    Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.reports_dir).mkdir(parents=True, exist_ok=True)

    # 2. Initialize databases
    try:
        await init_mongodb(settings)
    except Exception as e:
        logger.error(f"Failed to initialize MongoDB: {e}")

    try:
        await init_neo4j(settings)
        await init_graph_schema()
    except Exception as e:
        logger.warning(f"Failed to initialize Neo4j: {e}")

    # 3. Model catalog validation at startup (non-fatal warning)
    if settings.groq_api_key:
        try:
            groq_p = GroqProvider(settings)
            models = await groq_p.list_models()
            if models and settings.groq_model not in models:
                logger.warning(
                    f"Configured GROQ_MODEL '{settings.groq_model}' was not found in active Groq catalog. "
                    f"Available models sample: {models[:5]}"
                )
        except Exception as e:
            logger.warning(f"Could not verify Groq model catalog at startup: {e}")

    if settings.openrouter_api_key:
        try:
            or_p = OpenRouterProvider(settings)
            models = await or_p.list_models()
            if models and settings.openrouter_model not in models:
                logger.warning(
                    f"Configured OPENROUTER_MODEL '{settings.openrouter_model}' was not found in active OpenRouter catalog."
                )
        except Exception as e:
            logger.warning(f"Could not verify OpenRouter model catalog at startup: {e}")

    logger.info("NexusMind backend initialized successfully.")
    yield

    # Shutdown
    logger.info("Shutting down NexusMind backend...")
    await close_mongodb()
    await close_neo4j()
    logger.info("NexusMind backend shutdown complete.")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="NexusMind Analytical Intelligence API",
        description="AI-Based Automated Analytical Report Generation and Summarization System",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS Middleware — config-driven from CORS_ALLOWED_ORIGINS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register domain exception handlers
    register_exception_handlers(app)

    # Include all API routers under /api/v1 prefix
    api_prefix = "/api/v1"
    app.include_router(health_router, prefix=api_prefix)
    app.include_router(upload_router, prefix=api_prefix)
    app.include_router(analysis_router, prefix=api_prefix)
    app.include_router(kpi_router, prefix=api_prefix)
    app.include_router(anomaly_router, prefix=api_prefix)
    app.include_router(graph_router, prefix=api_prefix)
    app.include_router(summary_router, prefix=api_prefix)
    app.include_router(report_router, prefix=api_prefix)
    app.include_router(history_router, prefix=api_prefix)

    # Root health endpoint for convenience
    @app.get("/")
    async def root():
        return {"name": "NexusMind API", "version": "1.0.0", "docs": "/docs"}

    return app


app = create_app()
