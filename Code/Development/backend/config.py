from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_PATH = Path(__file__).resolve().parent / ".env"

class Settings(BaseSettings):
    # Database
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "nexusmind"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "changeme"

    # LLM — model names come from env, never hardcoded in provider classes
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"
    groq_models: str = "openai/gpt-oss-20b,llama-3.3-70b-versatile,llama-3.1-8b-instant,llama3-70b-8192"
    
    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemini-2.0-flash-lite-001"
    openrouter_models: str = "google/gemini-2.0-flash-lite-001,meta-llama/llama-3.3-70b-instruct,deepseek/deepseek-chat"
    llm_provider: str = "groq"

    # Storage
    uploads_dir: str = "./uploads"
    reports_dir: str = "./reports"
    upload_max_size_mb: int = 50

    # ML hyperparameters
    ml_contamination: str = "0.1"  # kept as str to support "auto" or float
    ml_random_state: int = 42

    # Preprocessing
    sg_window_length: int = 5
    sg_polyorder: int = 2

    # CORS — comma-separated origins string parsed into list
    cors_allowed_origins: str = "http://localhost:8080,http://localhost:5173,http://localhost:3000"

    @property
    def groq_models_list(self) -> list[str]:
        """Parse GROQ_MODELS env var into ordered list of models to try."""
        if not self.groq_models:
            return ["openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192"]
        models = [m.strip() for m in self.groq_models.split(",") if m.strip()]
        return models if models else ["openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192"]

    @property
    def openrouter_models_list(self) -> list[str]:
        """Parse OPENROUTER_MODELS env var into ordered list."""
        if not self.openrouter_models:
            return [self.openrouter_model] if self.openrouter_model else ["google/gemini-2.0-flash-lite-001"]
        models = [m.strip() for m in self.openrouter_models.split(",") if m.strip()]
        return models if models else ["google/gemini-2.0-flash-lite-001"]

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ALLOWED_ORIGINS env var into a list for CORSMiddleware."""
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=str(_ENV_PATH) if _ENV_PATH.exists() else ".env",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
