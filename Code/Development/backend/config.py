from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    mongo_uri: str = "mongodb://mongodb:27017"
    mongo_db_name: str = "nexusmind"
    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "changeme"

    # LLM — model names come from env, never hardcoded in provider classes
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    openrouter_api_key: str = ""
    openrouter_model: str = "mistralai/mixtral-8x7b-instruct"
    llm_provider: str = "groq"

    # Storage
    uploads_dir: str = "/app/uploads"
    reports_dir: str = "/app/reports"
    upload_max_size_mb: int = 50

    # ML hyperparameters
    ml_contamination: str = "0.1"  # kept as str to support "auto" or float
    ml_random_state: int = 42

    # Preprocessing
    sg_window_length: int = 5
    sg_polyorder: int = 2

    # CORS — comma-separated origins string parsed into list
    cors_allowed_origins: str = "http://localhost:8080,http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ALLOWED_ORIGINS env var into a list for CORSMiddleware."""
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
