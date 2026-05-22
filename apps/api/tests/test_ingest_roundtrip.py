"""Focused ingest round-trip tests (sqlite, no external MinIO)."""

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from nereus_api import db as db_module
from nereus_api import models  # noqa: F401
from nereus_api.main import app

TOKEN = {"X-Buoy-Token": "STRONG_UPLOAD_TOKEN_69420"}


def _client(tmp_path):
    db_path = tmp_path / "ingest.sqlite3"
    engine = create_engine(f"sqlite:///{db_path}")
    db_module.Base.metadata.create_all(bind=engine)
    original = db_module.SessionLocal
    db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return TestClient(app), original


def test_all_ingest_types_in_latest(tmp_path):
    c, original = _client(tmp_path)
    try:
        ts = "2026-05-01T12:30:00Z"
        assert c.post("/v1/ingest/health", headers=TOKEN, json={"node_id": "ucl-buoy", "ts": ts, "status": "ok"}).status_code == 200
        assert c.post("/v1/ingest/env", headers=TOKEN, json={"node_id": "ucl-buoy", "ts": ts, "water_temp_c": 12.0}).status_code == 200
        assert c.post(
            "/v1/ingest/telemetry",
            headers=TOKEN,
            json={"node_id": "ucl-buoy", "ts": ts, "source": "replay", "seq": 1},
        ).status_code == 200
        assert c.post(
            "/v1/ingest/acoustic_meta",
            headers=TOKEN,
            json={
                "node_id": "ucl-buoy",
                "ts": ts,
                "display_metrics": {"leq_db": 55.0},
            },
        ).status_code == 200
        assert c.post(
            "/v1/ingest/wave_stats",
            headers=TOKEN,
            json={"node_id": "ucl-buoy", "ts": ts, "window_s": 60, "fs_hz": 50, "hs_m": 0.3},
        ).status_code == 200

        body = c.get("/v1/nodes/ucl-buoy/snapshots/latest").json()
        assert body["health"] is not None
        assert body["env"] is not None
        assert body["telemetry"] is not None
        assert body["acoustics"] is not None
        assert body["wave_stats"] is not None
        assert body["ts"] == ts
    finally:
        db_module.SessionLocal = original
