import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "local-dev-internal-key-change-in-production")
    MAX_INPUT_BYTES: int = int(os.getenv("MAX_INPUT_BYTES", "52428800"))
    MAX_PREVIEW_TRIANGLES: int = int(os.getenv("MAX_PREVIEW_TRIANGLES", "200000"))
    REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "120"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
