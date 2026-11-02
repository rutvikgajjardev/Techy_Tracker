import os
from datetime import timedelta
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path, override=True)
load_dotenv(override=True)

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "splitease-production-secret-key-3910")
    JWT_SECRET = os.getenv("JWT_SECRET", "splitease-jwt-signing-key-9281-super-secret-32b")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "72"))
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/splitease")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,https://*").split(",")
    ENVIRONMENT = os.getenv("FLASK_ENV", "development")
    DEBUG = ENVIRONMENT == "development"
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "o3eodknq")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "815253277365151")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
    CLOUDINARY_URL = os.getenv("CLOUDINARY_URL")
    # SMTP Gmail Configuration for Email Verification & Password Reset
    SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
