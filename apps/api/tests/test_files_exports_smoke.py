from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from nereus_api import db as db_module
from nereus_api import models  # noqa: F401
from nereus_api.main import app

TOKEN = {"X-Buoy-Token": "STRONG_UPLOAD_TOKEN_69420"}


def _client(tmp_path):
    db_path = tmp_path / "files_exports.sqlite3"
    engine = create_engine(f"sqlite:///{db_path}")
    db_module.Base.metadata.create_all(bind=engine)
    original = db_module.SessionLocal
    db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return TestClient(app), original


def test_files_and_exports_endpoints(tmp_path):
    c, original = _client(tmp_path)
    try:
        c.post(
            "/v1/ingest/acoustic_meta",
            headers=TOKEN,
            json={"node_id": "ucl-buoy", "ts": "2026-05-01T12:00:00Z", "filename": "chunk.wav"},
        )
        files = c.get("/v1/files")
        assert files.status_code == 200
        assert "items" in files.json()
        assert c.get("/v1/exports/latest_snapshot.json").status_code == 200
        assert c.get("/v1/exports/telemetry.csv").status_code == 200
        assert c.get("/v1/exports/environment.csv").status_code == 200
        assert c.get("/v1/exports/health.csv").status_code == 200
        assert c.get("/v1/exports/wave_stats.csv").status_code == 200
    finally:
        db_module.SessionLocal = original


def test_files_pi_only_download_returns_409(tmp_path):
    c, original = _client(tmp_path)
    try:
        c.post(
            "/v1/ingest/acoustic_meta",
            headers=TOKEN,
            json={
                "node_id": "ucl-buoy",
                "ts": "2026-06-03T12:00:00Z",
                "filename": "ucl-buoy_hydrophone.wav",
                "path": "/mnt/ssd/buoy/raw/audio/chunk.wav",
                "size_bytes": 12345,
            },
        )
        items = c.get("/v1/files").json()["items"]
        assert items[0]["status"] == "file_on_pi_not_synced"
        dl = c.get(f"/v1/files/{items[0]['file_id']}/download")
        assert dl.status_code == 409
    finally:
        db_module.SessionLocal = original
