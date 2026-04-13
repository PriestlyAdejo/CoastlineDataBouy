from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .api import router as v1_router
from .settings import get_settings
from .storage import ensure_minio_buckets

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    try:
        ensure_minio_buckets(settings)
    except Exception:
        logger.exception("MinIO bucket ensure failed; API will still start")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Nereus API",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(v1_router, prefix=settings.api_prefix)
    return app


app = create_app()

