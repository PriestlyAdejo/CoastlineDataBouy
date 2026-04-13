from __future__ import annotations

import logging

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from .settings import Settings

logger = logging.getLogger(__name__)

# MinIO expects path-style URLs and SigV4; virtual-hosted style to IP endpoints often yields 403.
_MINIO_BOTO_CONFIG = Config(
    signature_version="s3v4",
    s3={"addressing_style": "path"},
)


def get_s3_client(settings: Settings):
    return boto3.client(
        "s3",
        endpoint_url=settings.minio_endpoint,
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        region_name=settings.s3_region,
        use_ssl=settings.minio_endpoint.startswith("https://"),
        config=_MINIO_BOTO_CONFIG,
    )


def _ensure_bucket(client, name: str) -> None:
    try:
        client.create_bucket(Bucket=name)
        logger.info("Created MinIO bucket %r", name)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        status = e.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        if code in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
            return
        if status == 409:
            return
        raise


def ensure_minio_buckets(settings: Settings) -> None:
    if not settings.minio_access_key or not settings.minio_secret_key:
        logger.warning(
            "MINIO_ACCESS_KEY / MINIO_SECRET_KEY not set; skipping bucket ensure",
        )
        return
    client = get_s3_client(settings)
    try:
        for name in settings.minio_bucket_names():
            _ensure_bucket(client, name)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code == "InvalidAccessKeyId":
            logger.error(
                "MinIO does not recognize MINIO_ACCESS_KEY. It must match an identity on "
                "this server: use the same values as MINIO_ROOT_USER and MINIO_ROOT_PASSWORD "
                "in docker/compose.backend.yml (or set those two names in apps/api/.env). "
                "Remove stale MINIO_ACCESS_KEY=minioadmin if you changed the compose root user. "
                "If you changed compose credentials after MinIO first ran, delete the Docker "
                "volume for nereus_minio and recreate the container so the server re-inits.",
            )
        raise
