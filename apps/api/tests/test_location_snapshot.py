from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from nereus_api import db as db_module
from nereus_api import models  # noqa: F401
from nereus_api.main import app

TOKEN = {"X-Buoy-Token": "STRONG_UPLOAD_TOKEN_69420"}


def _client_with_db(tmp_path):
    db_path = tmp_path / "loc_test.sqlite3"
    engine = create_engine(f"sqlite:///{db_path}")
    db_module.Base.metadata.create_all(bind=engine)
    original = db_module.SessionLocal
    db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return TestClient(app), original


def test_latest_snapshot_location_fix(tmp_path):
    client, original = _client_with_db(tmp_path)
    try:
        payload = {
            "schema_version": "v1",
            "node_id": "ucl-buoy",
            "ts": "2026-06-03T12:00:00Z",
            "source": "gnss",
            "gps": {
                "lat": 50.82,
                "lon": -0.13,
                "quality": "fix",
                "fix_status": "3d",
                "satellites": 9,
                "hdop": 1.1,
            },
        }
        r = client.post("/v1/ingest/telemetry", headers=TOKEN, json=payload)
        assert r.status_code == 200

        latest = client.get("/v1/nodes/ucl-buoy/snapshots/latest").json()
        loc = latest.get("location")
        assert loc is not None
        assert loc["quality"] == "fix"
        assert loc["lat"] == 50.82
        assert loc["lon"] == -0.13
        assert loc["source"] == "gnss"
    finally:
        db_module.SessionLocal = original


def test_latest_snapshot_location_no_fix(tmp_path):
    client, original = _client_with_db(tmp_path)
    try:
        payload = {
            "schema_version": "v1",
            "node_id": "ucl-buoy",
            "ts": "2026-06-03T12:01:00Z",
            "source": "gnss",
            "gps": {
                "quality": "no_fix",
                "fix_status": "no_fix",
                "reason": "indoor_no_fix",
            },
        }
        client.post("/v1/ingest/telemetry", headers=TOKEN, json=payload)
        latest = client.get("/v1/nodes/ucl-buoy/snapshots/latest").json()
        loc = latest["location"]
        assert loc["quality"] == "no_fix"
        assert "lat" not in loc or loc.get("lat") is None
    finally:
        db_module.SessionLocal = original


def test_latest_snapshot_location_no_device(tmp_path):
    client, original = _client_with_db(tmp_path)
    try:
        payload = {
            "schema_version": "v1",
            "node_id": "ucl-buoy",
            "ts": "2026-06-03T12:03:00Z",
            "source": "no_device",
            "gps": {
                "quality": "no_device",
                "fix_status": "no_device",
                "reason": "no_device",
                "source": "no_device",
            },
        }
        client.post("/v1/ingest/telemetry", headers=TOKEN, json=payload)
        latest = client.get("/v1/nodes/ucl-buoy/snapshots/latest").json()
        loc = latest["location"]
        assert loc["quality"] == "no_device"
        assert loc["source"] == "no_device"
        assert "lat" not in loc or loc.get("lat") is None
    finally:
        db_module.SessionLocal = original


def test_latest_snapshot_location_quectel_at_fix(tmp_path):
    client, original = _client_with_db(tmp_path)
    try:
        payload = {
            "schema_version": "v1",
            "node_id": "ucl-buoy",
            "ts": "2026-06-03T12:04:00Z",
            "source": "quectel_at",
            "gps": {
                "lat": 50.82,
                "lon": -0.13,
                "quality": "fix",
                "fix_status": "3d",
                "source": "quectel_at",
                "satellites": 8,
            },
        }
        client.post("/v1/ingest/telemetry", headers=TOKEN, json=payload)
        latest = client.get("/v1/nodes/ucl-buoy/snapshots/latest").json()
        loc = latest["location"]
        assert loc["source"] == "quectel_at"
        assert loc["quality"] == "fix"
        assert loc["lat"] == 50.82
    finally:
        db_module.SessionLocal = original


def test_latest_snapshot_location_ip_fallback(tmp_path):
    client, original = _client_with_db(tmp_path)
    try:
        payload = {
            "schema_version": "v1",
            "node_id": "ucl-buoy",
            "ts": "2026-06-03T12:02:00Z",
            "source": "gnss",
            "gps": {
                "lat": 51.5,
                "lon": -0.1,
                "source": "ip_fallback",
                "quality": "approximate",
            },
        }
        client.post("/v1/ingest/telemetry", headers=TOKEN, json=payload)
        latest = client.get("/v1/nodes/ucl-buoy/snapshots/latest").json()
        loc = latest["location"]
        assert loc["quality"] == "approximate"
        assert loc["source"] == "ip_fallback"
    finally:
        db_module.SessionLocal = original
