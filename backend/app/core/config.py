from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Creator OS"
    API_V1_STR: str = "/api/v1"
    
    # Database - REQUIRED in production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://creator:password123@localhost:5433/creator_os")
    
    # Security - MUST be set in production via environment variable
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-only-insecure-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # LLM Configuration (at least one required for AI features)
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    HF_TOKEN: Optional[str] = None  # Hugging Face Router token
    
    # Sentry (optional - for error tracking)
    SENTRY_DSN: Optional[str] = None

    # Redis (for Rate Limiting & Celery)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # CORS Configuration (comma-separated list of allowed origins)
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
    
    # Frontend URL (for redirects)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Environment detection
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Security check for production
if settings.is_production and settings.SECRET_KEY == "dev-only-insecure-key-change-in-production":
    raise ValueError("SECRET_KEY must be set in production! Generate with: openssl rand -hex 32")
