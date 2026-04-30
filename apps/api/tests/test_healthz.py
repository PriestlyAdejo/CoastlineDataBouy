from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from nereus_api import db as db_module
from nereus_api import models  # noqa: F401
from nereus_api.main import app


def test_healthz():
    c = TestClient(app)
    r = c.get("/v1/healthz")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True


def test_ingest_health_updates_latest_snapshot(tmp_path):
    db_path = tmp_path / "api_test.sqlite3"
    engine = create_engine(f"sqlite:///{db_path}")
    db_module.Base.metadata.create_all(bind=engine)
    original_session_local = db_module.SessionLocal
    db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    try:
        c = TestClient(app)
        ingest = c.post(
            "/v1/ingest/health",
            headers={"X-Buoy-Token": "STRONG_UPLOAD_TOKEN_69420"},
            json={
                "schema_version": "v1",
                "node_id": "ucl-buoy",
                "ts": "2026-04-30T17:00:00Z",
                "status": "ok",
                "pi": {"cpu_pct": 11.2, "mem_pct": 33.1, "cpu_temp_c": 44.2, "uptime_s": 1000},
                "storage": {
                    "mount_ok": True,
                    "mountpoint": "/mnt/harddrive/buoy",
                    "free_bytes": 1000000000,
                    "total_bytes": 2000000000,
                },
            },
        )
        assert ingest.status_code == 200
        assert ingest.json() == {"accepted": True}

        latest = c.get("/v1/nodes/ucl-buoy/snapshots/latest")
        assert latest.status_code == 200
        body = latest.json()
        assert body["health"] is not None
        assert body["health"]["node_id"] == "ucl-buoy"
        assert body["health"]["status"] == "ok"
    finally:
        db_module.SessionLocal = original_session_local
