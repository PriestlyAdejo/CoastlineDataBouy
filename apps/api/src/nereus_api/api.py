from __future__ import annotations

from datetime import datetime, timezone
import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from sqlalchemy import desc, select

from .auth import require_buoy_token
from .db import session_scope
from .models import (
    AcousticMetaSnapshot,
    EnvSnapshot,
    HealthSnapshot,
    TelemetrySample,
    WaveStatsSnapshot,
)

router = APIRouter()


def _payload_node_ts(payload: dict) -> tuple[str, str]:
    node_id = str(payload.get("node_id", "unknown-node"))
    ts = str(payload.get("ts", datetime.now(timezone.utc).isoformat()))
    return node_id, ts


def _latest_payload(session, model, node_id: str) -> dict | None:
    row = session.execute(
        select(model)
        .where(model.node_id == node_id)
        .order_by(desc(model.ts), desc(model.id))
        .limit(1)
    ).scalar_one_or_none()
    return None if row is None else row.payload


def _payload_ts(payload: dict | None) -> str | None:
    if isinstance(payload, dict):
        ts = payload.get("ts")
        if isinstance(ts, str) and ts.strip():
            return ts
    return None


def _build_location(telemetry: dict | None) -> dict | None:
    """Normalize latest telemetry GPS into a handover-friendly location object."""
    if not isinstance(telemetry, dict):
        return None
    gps = telemetry.get("gps")
    if not isinstance(gps, dict):
        return None

    ts = telemetry.get("ts")
    source = str(gps.get("source") or telemetry.get("source") or "gnss")
    quality = str(gps.get("quality") or "")
    fix_status = str(gps.get("fix_status") or gps.get("status") or "")
    reason = gps.get("reason")

    lat = gps.get("lat")
    lon = gps.get("lon")
    try:
        lat_f = float(lat) if lat is not None else None
        lon_f = float(lon) if lon is not None else None
    except (TypeError, ValueError):
        lat_f, lon_f = None, None

    if source == "ip_fallback" or quality == "approximate":
        if lat_f is None or lon_f is None:
            return {
                "source": "ip_fallback",
                "quality": "approximate",
                "fix_status": fix_status or "approximate",
                "timestamp": ts,
            }
        return {
            "lat": lat_f,
            "lon": lon_f,
            "source": "ip_fallback",
            "quality": "approximate",
            "fix_status": fix_status or "approximate",
            "timestamp": ts,
        }

    if quality == "no_fix" or (lat_f is None or lon_f is None):
        out: dict = {
            "source": "gnss",
            "quality": "no_fix",
            "fix_status": fix_status or "no_fix",
            "timestamp": ts,
        }
        if reason:
            out["reason"] = reason
        return out

    fix_q = int(gps.get("fix_quality") or 0) if gps.get("fix_quality") is not None else None
    fix_out = "3d" if fix_q and fix_q > 0 else (fix_status or "fix")
    loc: dict = {
        "lat": lat_f,
        "lon": lon_f,
        "source": "gnss",
        "quality": "fix",
        "fix_status": fix_out,
        "timestamp": ts,
    }
    if gps.get("satellites") is not None:
        loc["satellites"] = gps.get("satellites")
    if gps.get("hdop") is not None:
        loc["hdop"] = gps.get("hdop")
    return loc


def _acoustic_ts(payload: dict | None) -> str | None:
    if not isinstance(payload, dict):
        return None
    for key in ("ts", "ts_end", "ts_start"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


@router.get("/healthz")
def healthz():
    return {"ok": True, "ts": datetime.now(timezone.utc).isoformat()}


@router.post("/ingest/telemetry", dependencies=[Depends(require_buoy_token)])
def ingest_telemetry(payload: dict):
    node_id, ts = _payload_node_ts(payload)
    with session_scope() as session:
        session.add(
            TelemetrySample(
                node_id=node_id,
                ts=ts,
                source=str(payload.get("source", "unknown")),
                seq=payload.get("seq"),
                arduino_ms=payload.get("arduino_ms"),
                onboard_temp_c=payload.get("onboard_temp_c"),
                onboard_rh_pct=payload.get("onboard_rh_pct"),
                accel_x=payload.get("accel_x"),
                accel_y=payload.get("accel_y"),
                accel_z=payload.get("accel_z"),
                pack_v=payload.get("pack_v"),
                payload=payload,
            )
        )
    return {"accepted": True}


@router.post("/ingest/health", dependencies=[Depends(require_buoy_token)])
def ingest_health(payload: dict):
    node_id, ts = _payload_node_ts(payload)
    pi = payload.get("pi") or {}
    storage = payload.get("storage") or {}
    with session_scope() as session:
        session.add(
            HealthSnapshot(
                node_id=node_id,
                ts=ts,
                status=str(payload.get("status", "unknown")),
                cpu_pct=pi.get("cpu_pct"),
                mem_pct=pi.get("mem_pct"),
                cpu_temp_c=pi.get("cpu_temp_c"),
                storage_mount_ok=1 if storage.get("mount_ok") else 0 if "mount_ok" in storage else None,
                storage_mountpoint=storage.get("mountpoint"),
                storage_free_bytes=storage.get("free_bytes"),
                storage_total_bytes=storage.get("total_bytes"),
                payload=payload,
            )
        )
    return {"accepted": True}

@router.post("/ingest/env", dependencies=[Depends(require_buoy_token)])
def ingest_env(payload: dict):
    node_id, ts = _payload_node_ts(payload)
    with session_scope() as session:
        session.add(EnvSnapshot(node_id=node_id, ts=ts, payload=payload))
    return {"accepted": True}


@router.post("/ingest/wave_stats", dependencies=[Depends(require_buoy_token)])
def ingest_wave_stats(payload: dict):
    node_id, ts = _payload_node_ts(payload)
    with session_scope() as session:
        session.add(WaveStatsSnapshot(node_id=node_id, ts=ts, payload=payload))
    return {"accepted": True}


@router.post("/ingest/acoustic_meta", dependencies=[Depends(require_buoy_token)])
def ingest_acoustic_meta(payload: dict):
    node_id, ts = _payload_node_ts(payload)
    with session_scope() as session:
        session.add(AcousticMetaSnapshot(node_id=node_id, ts=ts, payload=payload))
    return {"accepted": True}


@router.get("/nodes")
def list_nodes():
    # v1 stub
    return [{"node_id": "ucl-buoy", "display_name": "UCL Buoy"}]


@router.get("/nodes/{node_id}/snapshots/latest")
def latest_snapshots(node_id: str):
    with session_scope() as session:
        telemetry = _latest_payload(session, TelemetrySample, node_id)
        env = _latest_payload(session, EnvSnapshot, node_id)
        health = _latest_payload(session, HealthSnapshot, node_id)
        acoustics = _latest_payload(session, AcousticMetaSnapshot, node_id)
        wave_stats = _latest_payload(session, WaveStatsSnapshot, node_id)

    valid_timestamps = [
        ts
        for ts in (
            _payload_ts(telemetry),
            _payload_ts(env),
            _payload_ts(health),
            _acoustic_ts(acoustics),
            _payload_ts(wave_stats),
        )
        if ts
    ]
    latest_ts = max(valid_timestamps) if valid_timestamps else datetime.now(timezone.utc).isoformat()

    location = _build_location(telemetry)

    return {
        "node_id": node_id,
        "telemetry": telemetry,
        "env": env,
        "health": health,
        "acoustics": acoustics,
        "wave_stats": wave_stats,
        "location": location,
        "ts": latest_ts,
    }


def _latest_rows(session, model, limit: int = 500) -> list[dict]:
    rows = (
        session.execute(select(model).order_by(desc(model.ts), desc(model.id)).limit(limit))
        .scalars()
        .all()
    )
    return [r.payload for r in rows if isinstance(r.payload, dict)]


def _csv_from_dicts(rows: list[dict], include_fields: list[str]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=include_fields)
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k) for k in include_fields})
    return buf.getvalue()


@router.get("/files", summary="List handover file metadata")
def list_files():
    with session_scope() as session:
        acoustics = _latest_rows(session, AcousticMetaSnapshot, limit=200)
    out: list[dict] = []
    for idx, row in enumerate(acoustics, start=1):
        path = row.get("path") or row.get("file_path") or ""
        available = bool(path and str(path).startswith("/"))
        out.append(
            {
                "file_id": f"acoustic-{idx}",
                "filename": row.get("filename") or row.get("basename") or f"acoustic_{idx}.wav",
                "type": "wav",
                "source": row.get("source", "hydrophone"),
                "size_bytes": row.get("size_bytes"),
                "timestamp": row.get("ts") or row.get("ts_end") or row.get("ts_start"),
                "available": available,
                "status": "available" if available else "file_on_pi_not_synced",
                "reason": None if available else "file_on_pi_not_synced",
                "path": path or None,
                "payload": row,
            }
        )
    return {"items": out}


@router.get("/files/{file_id}", summary="Get one file metadata record")
def get_file(file_id: str):
    listing = list_files().get("items", [])
    for item in listing:
        if item["file_id"] == file_id:
            return item
    raise HTTPException(status_code=404, detail="file_not_found")


@router.get("/files/{file_id}/download", summary="Download local file when available")
def download_file(file_id: str):
    item = get_file(file_id)
    if not item.get("available") or not item.get("path"):
        raise HTTPException(status_code=409, detail="file_on_pi_not_synced")
    return FileResponse(item["path"], filename=item["filename"])


@router.get("/exports/latest_snapshot.json", summary="Export latest ucl-buoy snapshot JSON")
def export_latest_snapshot():
    return JSONResponse(latest_snapshots("ucl-buoy"))


@router.get("/exports/telemetry.csv", summary="Export telemetry CSV")
def export_telemetry_csv():
    with session_scope() as session:
        rows = _latest_rows(session, TelemetrySample, limit=1000)
    content = _csv_from_dicts(
        rows,
        ["ts", "node_id", "source", "seq", "arduino_ms", "onboard_temp_c", "onboard_rh_pct", "accel_x", "accel_y", "accel_z", "pack_v"],
    )
    return PlainTextResponse(content=content, media_type="text/csv")


@router.get("/exports/environment.csv", summary="Export environment CSV")
def export_environment_csv():
    with session_scope() as session:
        rows = _latest_rows(session, EnvSnapshot, limit=1000)
    content = _csv_from_dicts(rows, ["ts", "node_id", "source", "water_temp_c", "sensor_id"])
    return PlainTextResponse(content=content, media_type="text/csv")


@router.get("/exports/health.csv", summary="Export health CSV")
def export_health_csv():
    with session_scope() as session:
        rows = _latest_rows(session, HealthSnapshot, limit=1000)
    content = _csv_from_dicts(rows, ["ts", "node_id", "status"])
    return PlainTextResponse(content=content, media_type="text/csv")


@router.get("/exports/wave_stats.csv", summary="Export wave stats CSV")
def export_wave_csv():
    with session_scope() as session:
        rows = _latest_rows(session, WaveStatsSnapshot, limit=1000)
    content = _csv_from_dicts(rows, ["ts", "node_id", "window_s", "hs_m", "tp_s", "tm01_s", "tz_s"])
    return PlainTextResponse(content=content, media_type="text/csv")

