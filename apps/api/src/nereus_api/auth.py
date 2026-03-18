from __future__ import annotations

from fastapi import Header, HTTPException

from .settings import get_settings


def require_buoy_token(x_buoy_token: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not x_buoy_token or x_buoy_token != settings.buoy_upload_token:
        raise HTTPException(status_code=401, detail="Invalid buoy token")

