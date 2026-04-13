from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_API_DIR = Path(__file__).resolve().parents[2]
_ENV_FILE = _API_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = Field(
        default="dev",
        validation_alias=AliasChoices("NEREUS_ENV", "ENVIRONMENT"),
    )
    api_prefix: str = Field(
        default="/v1",
        validation_alias=AliasChoices("NEREUS_API_PREFIX", "API_PREFIX"),
    )
    buoy_upload_token: str = Field(
        default="dev-token-change-me",
        validation_alias=AliasChoices("NEREUS_BUOY_UPLOAD_TOKEN", "BUOY_UPLOAD_TOKEN"),
    )

    database_url: str = Field(
        default="postgresql+psycopg://nereus:nereus@127.0.0.1:5432/nereus",
        validation_alias=AliasChoices("DATABASE_URL", "NEREUS_DATABASE_URL"),
    )

    minio_endpoint: str = Field(
        default="127.0.0.1:9000",
        validation_alias=AliasChoices("MINIO_ENDPOINT", "NEREUS_S3_ENDPOINT_URL"),
    )
    # MINIO_ACCESS_KEY / MINIO_SECRET_KEY = app/service account (prod). For local dev you can
    # instead set MINIO_ROOT_USER / MINIO_ROOT_PASSWORD to match docker/compose.backend.yml.
    minio_access_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "MINIO_ACCESS_KEY",
            "NEREUS_S3_ACCESS_KEY_ID",
            "MINIO_ROOT_USER",
        ),
    )
    minio_secret_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "MINIO_SECRET_KEY",
            "NEREUS_S3_SECRET_ACCESS_KEY",
            "MINIO_ROOT_PASSWORD",
        ),
    )
    minio_secure: bool = Field(default=False, validation_alias="MINIO_SECURE")

    minio_bucket_raw: str = Field(
        default="nereus-raw-acoustic",
        validation_alias="MINIO_BUCKET_RAW",
    )
    minio_bucket_derived: str = Field(
        default="nereus-derived",
        validation_alias="MINIO_BUCKET_DERIVED",
    )
    minio_bucket_exports: str = Field(
        default="nereus-exports",
        validation_alias="MINIO_BUCKET_EXPORTS",
    )

    s3_region: str = Field(
        default="us-east-1",
        validation_alias=AliasChoices("S3_REGION", "NEREUS_S3_REGION"),
    )

    @model_validator(mode="after")
    def normalize_urls(self):
        db = self.database_url
        if db.startswith("postgresql://") and not db.startswith("postgresql+"):
            self.database_url = db.replace("postgresql://", "postgresql+psycopg://", 1)

        ep = self.minio_endpoint.strip()
        if not ep.startswith(("http://", "https://")):
            scheme = "https" if self.minio_secure else "http"
            self.minio_endpoint = f"{scheme}://{ep}"

        return self

    def minio_bucket_names(self) -> tuple[str, ...]:
        return (
            self.minio_bucket_raw,
            self.minio_bucket_derived,
            self.minio_bucket_exports,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
