"""Application settings loaded from environment variables."""

import os

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./rent_aasan.db")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
ALGORITHM = "HS256"
