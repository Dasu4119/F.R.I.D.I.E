from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="FRIDIE_", extra="ignore")

    app_name: str = "F.R.I.D.I.E. API"
    environment: str = "development"
    mongodb_uri: str = Field(default="mongodb://localhost:27017")
    mongodb_database: str = Field(default="FRIDIE", pattern=r"^[A-Za-z0-9_-]+$")
    cors_origins: str = "http://localhost:3000,http://localhost:4173"
    request_max_characters: int = Field(default=4_000, ge=100, le=20_000)
    ollama_base_url: str = Field(default="http://host.docker.internal:11434", pattern=r"^https?://")
    ollama_model: str = ""
    ollama_timeout_seconds: float = Field(default=3.0, ge=0.5, le=30.0)

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
