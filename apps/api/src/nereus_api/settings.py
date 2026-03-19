from __future__ import annotations

import os
from pydantic import BaseModel


class Settings(BaseModel):
    # API
    environment: str = "dev"
    api_prefix: str = "/v1"

    # Auth (v1: single shared token for buoy uploads)
    buoy_upload_token: str = "dev-token-change-me"

    # Database
    database_url: str = "postgresql+psycopg://nereus:nereus@localhost:5432/nereus"

    # Object storage (S3-compatible, MinIO in docker-compose)
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key_id: str = "minioadmin"
    s3_secret_access_key: str = "minioadmin"
    s3_bucket: str = "nereus"
    s3_region: str = "us-east-1"


def get_settings() -> Settings:
    # Windows-friendly: env overrides without extra dependencies.
    return Settings(
        environment=os.getenv("NEREUS_ENV", "dev"),
        api_prefix=os.getenv("NEREUS_API_PREFIX", "/v1"),
        buoy_upload_token=os.getenv("NEREUS_BUOY_UPLOAD_TOKEN", "dev-token-change-me"),
        database_url=os.getenv(
            "NEREUS_DATABASE_URL",
            "postgresql+psycopg://nereus:nereus@localhost:5432/nereus",
        ),
        s3_endpoint_url=os.getenv("NEREUS_S3_ENDPOINT_URL", "http://localhost:9000"),
        s3_access_key_id=os.getenv("NEREUS_S3_ACCESS_KEY_ID", "minioadmin"),
        s3_secret_access_key=os.getenv("NEREUS_S3_SECRET_ACCESS_KEY", "minioadmin"),
        s3_bucket=os.getenv("NEREUS_S3_BUCKET", "nereus"),
        s3_region=os.getenv("NEREUS_S3_REGION", "us-east-1"),
    )

