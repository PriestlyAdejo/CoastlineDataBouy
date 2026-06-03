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


def test_cors_allows_local_dashboard_origin():
    c = TestClient(app)
    r = c.options(
        "/v1/healthz",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"


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


def test_latest_snapshot_ignores_null_timestamps(tmp_path):
    db_path = tmp_path / "api_test_null_ts.sqlite3"
    engine = create_engine(f"sqlite:///{db_path}")
    db_module.Base.metadata.create_all(bind=engine)
    original_session_local = db_module.SessionLocal
    db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    try:
        c = TestClient(app)

        health_payload = {
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
        }
        r1 = c.post(
            "/v1/ingest/health",
            headers={"X-Buoy-Token": "STRONG_UPLOAD_TOKEN_69420"},
            json=health_payload,
        )
        assert r1.status_code == 200

        env_payload = {"node_id": "ucl-buoy", "ts": None, "temp_c": 10.0}
        r2 = c.post(
            "/v1/ingest/env",
            headers={"X-Buoy-Token": "STRONG_UPLOAD_TOKEN_69420"},
            json=env_payload,
        )
        assert r2.status_code == 200

        latest = c.get("/v1/nodes/ucl-buoy/snapshots/latest")
        assert latest.status_code == 200
        body = latest.json()
        assert body["health"] is not None
        assert body["ts"] == "2026-04-30T17:00:00Z"
    finally:
        db_module.SessionLocal = original_session_local


def test_ingest_wave_stats_updates_latest_snapshot(tmp_path):
    db_path = tmp_path / "api_test_wave.sqlite3"
    engine = create_engine(f"sqlite:///{db_path}")
    db_module.Base.metadata.create_all(bind=engine)
    original_session_local = db_module.SessionLocal
    db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    try:
        c = TestClient(app)
        payload = {
            "schema_version": "v1",
            "node_id": "ucl-buoy",
            "ts": "2026-05-01T12:00:00Z",
            "window_s": 900,
            "fs_hz": 50.0,
            "hs_m": 0.25,
            "provenance": {"source": "brighton_marina_2026_05_01_replay", "demo_mode": True},
        }
        r = c.post(
            "/v1/ingest/wave_stats",
            headers={"X-Buoy-Token": "STRONG_UPLOAD_TOKEN_69420"},
            json=payload,
        )
        assert r.status_code == 200

        latest = c.get("/v1/nodes/ucl-buoy/snapshots/latest")
        body = latest.json()
        assert "wave_stats" in body
        assert body["wave_stats"] is not None
        assert body["wave_stats"]["hs_m"] == 0.25
    finally:
        db_module.SessionLocal = original_session_local


def test_ingest_acoustic_provenance_and_display_metrics(tmp_path):
    db_path = tmp_path / "api_test_acoustic.sqlite3"
    engine = create_engine(f"sqlite:///{db_path}")
    db_module.Base.metadata.create_all(bind=engine)
    original_session_local = db_module.SessionLocal
    db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    try:
        c = TestClient(app)
        payload = {
            "schema_version": "v1",
            "node_id": "ucl-buoy",
            "ts_end": "2026-05-01T14:00:00Z",
            "ts_start": "2026-05-01T13:00:00Z",
            "format": {
                "container": "wav",
                "codec": "pcm_s32le",
                "sample_rate_hz": 96000,
                "channels": 2,
                "bit_depth": 32,
            },
            "artifact": {
                "path": "replay/sample.wav",
                "size_bytes": 1000,
                "sha256": "a" * 64,
            },
            "display_metrics": {"leq_db": 61.8, "peak_db": 77.4},
            "provenance": {
                "source": "brighton_marina_2026_05_01_replay",
                "demo_mode": True,
                "test_date": "2026-05-01",
                "measured_fields": ["display_metrics.leq_db"],
                "derived_fields": [],
                "inferred_fields": [],
            },
        }
        r = c.post(
            "/v1/ingest/acoustic_meta",
            headers={"X-Buoy-Token": "STRONG_UPLOAD_TOKEN_69420"},
            json=payload,
        )
        assert r.status_code == 200

        latest = c.get("/v1/nodes/ucl-buoy/snapshots/latest")
        body = latest.json()
        assert body["acoustics"] is not None
        assert body["acoustics"]["display_metrics"]["leq_db"] == 61.8
        assert body["acoustics"]["provenance"]["source"] == "brighton_marina_2026_05_01_replay"
        assert body["ts"] == "2026-05-01T14:00:00Z"
    finally:
        db_module.SessionLocal = original_session_local
