import os
from pydantic_settings import BaseSettings

DB_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DB_PATH = os.path.join(DB_DIR, "campuslink_test.db")

DEV_INSECURE_JWT_SECRET = "dev-insecure-jwt-key-not-for-production"

class Settings(BaseSettings):
    # Legacy FastAPI Backend Configuration (Deprecated - Active backend is Laravel)
    # Default to SQLite for local development/testing.
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
    
    # Load JWT secret from environment with development fallback
    AUTH_JWT_SECRET: str = os.getenv("AUTH_JWT_SECRET", DEV_INSECURE_JWT_SECRET)
    AUTH_JWT_ALGORITHM: str = os.getenv("AUTH_JWT_ALGORITHM", "HS256")
    AUTH_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("AUTH_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    AUTH_REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("AUTH_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Prevent insecure development fallback from being treated as production-safe
_env = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "local")).lower()
if _env in ("production", "prod", "staging") and settings.AUTH_JWT_SECRET == DEV_INSECURE_JWT_SECRET:
    raise RuntimeError(
        "CRITICAL SECURITY CONFIGURATION ERROR: AUTH_JWT_SECRET must be explicitly set "
        "to a strong, unique secret key in production or staging environments."
    )
