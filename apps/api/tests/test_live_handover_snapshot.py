from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from nereus_api import db as db_module
from nereus_api import models  # noqa: F401
from nereus_api.main import app

TOKEN = {"X-Buoy-Token": "STRONG_UPLOAD_TOKEN_69420"}


def _client_with_db(tmp_path):
    db_path = tmp_path / "live_handover.sqlite3"
    engine = create_engine(f"sqlite:///{db_path}")
    db_module.Base.metadata.create_all(bind=engine)
    original = db_module.SessionLocal
    db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return TestClient(app), original


def _live_ts() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def test_latest_snapshot_filters_replay_env_wave_when_live_handover_active(tmp_path):
    client, original = _client_with_db(tmp_path)
    live_ts = _live_ts()
    try:
        client.post(
            "/v1/ingest/env",
            headers=TOKEN,
            json={
                "node_id": "ucl-buoy",
                "ts": "2026-05-22T12:00:00Z",
                "source": "replay",
                "water_temp_c": 15.7,
                "replay": {"mode": "brighton-marina-2026-05-01"},
                "provenance": {"source": "brighton_marina_2026_05_01_replay", "demo_mode": True},
            },
        )
        client.post(
            "/v1/ingest/wave_stats",
            headers=TOKEN,
            json={
                "node_id": "ucl-buoy",
                "ts": "2026-05-22T12:00:00Z",
                "hs_m": 0.42,
                "tp_s": 4.1,
                "replay": {"phase_id": "anchored_quiet"},
                "provenance": {"source": "brighton_marina_2026_05_01_replay", "demo_mode": True},
            },
        )
        client.post(
            "/v1/ingest/health",
            headers=TOKEN,
            json={
                "node_id": "ucl-buoy",
                "ts": live_ts,
                "status": "ok",
                "pi": {"cpu_pct": 12.0, "mem_pct": 40.0},
                "storage": {"mount_ok": True, "mountpoint": "/mnt/harddrive"},
            },
        )
        client.post(
            "/v1/ingest/telemetry",
            headers=TOKEN,
            json={
                "node_id": "ucl-buoy",
                "ts": live_ts,
                "source": "gnss",
                "gps": {
                    "lat": 51.52,
                    "lon": -0.09,
                    "source": "ip_fallback",
                    "quality": "approximate",
                    "fix_status": "approximate",
                },
            },
        )
        client.post(
            "/v1/ingest/acoustic_meta",
            headers=TOKEN,
            json={
                "node_id": "ucl-buoy",
                "ts": live_ts,
                "filename": "ucl-buoy_hydrophone.wav",
                "size_bytes": 4096,
                "source": "hydrophone",
            },
        )

        latest = client.get("/v1/nodes/ucl-buoy/snapshots/latest").json()
        export = client.get("/v1/exports/latest_snapshot.json").json()

        assert latest["health"]["status"] == "ok"
        assert latest["acoustics"]["filename"] == "ucl-buoy_hydrophone.wav"
        assert latest["env"]["status"] == "no_live_environment_sensor"
        assert latest["wave_stats"]["status"] == "no_live_wave_sensor"
        assert "water_temp_c" not in latest["env"]
        assert "hs_m" not in latest["wave_stats"]
        assert latest["location"]["quality"] == "approximate"
        assert latest["location"]["source"] == "ip_fallback"

        assert export["env"]["status"] == "no_live_environment_sensor"
        assert export["wave_stats"]["status"] == "no_live_wave_sensor"
    finally:
        db_module.SessionLocal = original


def test_list_files_filters_replay_acoustics_when_live_handover_active(tmp_path):
    client, original = _client_with_db(tmp_path)
    live_ts = _live_ts()
    try:
        client.post(
            "/v1/ingest/acoustic_meta",
            headers=TOKEN,
            json={
                "node_id": "ucl-buoy",
                "ts": "2026-05-22T12:00:00Z",
                "filename": "replay_chunk.wav",
                "size_bytes": 1024,
                "source": "replay",
                "replay": {"mode": "brighton-marina-2026-05-01"},
            },
        )
        client.post(
            "/v1/ingest/health",
            headers=TOKEN,
            json={
                "node_id": "ucl-buoy",
                "ts": live_ts,
                "status": "ok",
                "pi": {"cpu_pct": 10.0},
            },
        )
        client.post(
            "/v1/ingest/acoustic_meta",
            headers=TOKEN,
            json={
                "node_id": "ucl-buoy",
                "ts": live_ts,
                "filename": "live_chunk.wav",
                "size_bytes": 2048,
                "source": "hydrophone",
            },
        )
        items = client.get("/v1/files").json()["items"]
        filenames = [i["filename"] for i in items]
        assert "live_chunk.wav" in filenames
        assert "replay_chunk.wav" not in filenames
    finally:
        db_module.SessionLocal = original


def test_latest_snapshot_keeps_replay_when_no_recent_live(tmp_path):
    client, original = _client_with_db(tmp_path)
    try:
        client.post(
            "/v1/ingest/env",
            headers=TOKEN,
            json={
                "node_id": "ucl-buoy",
                "ts": "2026-05-22T12:00:00Z",
                "source": "replay",
                "water_temp_c": 15.7,
                "replay": {"mode": "brighton-marina-2026-05-01"},
            },
        )
        latest = client.get("/v1/nodes/ucl-buoy/snapshots/latest").json()
        assert latest["env"]["water_temp_c"] == 15.7
    finally:
        db_module.SessionLocal = original
