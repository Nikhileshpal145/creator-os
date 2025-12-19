from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Creator OS"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://creator:password123@localhost:5433/creator_os"
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7" 
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # LLM Configuration
    OPENAI_API_KEY: Optional[str] = None
    
    # Sentry
    SENTRY_DSN: Optional[str] = None

    # Redis (for Rate Limiting & Celery)
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
