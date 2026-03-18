from __future__ import annotations

from fastapi import FastAPI

from .api import router as v1_router
from .settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Nereus API", version="0.1.0")
    app.include_router(v1_router, prefix=settings.api_prefix)
    return app


app = create_app()

