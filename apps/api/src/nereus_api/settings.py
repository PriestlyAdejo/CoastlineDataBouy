from __future__ import annotations

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
    # v1: simple; later load from env via pydantic-settings
    return Settings()

