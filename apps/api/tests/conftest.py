"""Pytest hooks — avoid blocking on MinIO when Docker stack is not running."""
from __future__ import annotations

import os

# Must run before Settings() is first loaded by test modules.
os.environ.setdefault("MINIO_ACCESS_KEY", "")
os.environ.setdefault("MINIO_SECRET_KEY", "")


def pytest_configure(config):
    from nereus_api.settings import get_settings

    get_settings.cache_clear()
