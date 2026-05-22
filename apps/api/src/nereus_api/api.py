from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
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

    return {
        "node_id": node_id,
        "telemetry": telemetry,
        "env": env,
        "health": health,
        "acoustics": acoustics,
        "wave_stats": wave_stats,
        "ts": latest_ts,
    }

