from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Vande Mataram Gau Hostel"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = Field(..., min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200

    # Database Configuration & Shared Pooling
    DATABASE_URL: str = Field(..., min_length=1)
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30

    # CORS Configuration
    CORS_ORIGINS: str = ""
    CORS_ORIGINS_REGEX: str = ""

    # Initial Administrator Setup
    INITIAL_ADMIN_EMAIL: str = Field(..., min_length=1)
    INITIAL_ADMIN_PASSWORD: str = Field(..., min_length=12)
    INITIAL_ADMIN_NAME: str = "Super Admin"

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore",
    )

    def get_cors_origins(self) -> List[str]:
        default_origins = [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5173",
            "http://localhost",
            "https://localhost",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:5173",
            "http://127.0.0.1",
        ]

        if self.CORS_ORIGINS:
            custom_origins = [
                origin.strip()
                for origin in self.CORS_ORIGINS.split(",")
                if origin.strip()
            ]
            return list(dict.fromkeys(default_origins + custom_origins))

        return default_origins


settings = Settings()