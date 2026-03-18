from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from .auth import require_buoy_token

router = APIRouter()


@router.get("/healthz")
def healthz():
    return {"ok": True, "ts": datetime.now(timezone.utc).isoformat()}


@router.post("/ingest/telemetry", dependencies=[Depends(require_buoy_token)])
def ingest_telemetry(payload: dict):
    # v1 stub: will validate against schema and store to Postgres
    return {"accepted": True}


@router.post("/ingest/health", dependencies=[Depends(require_buoy_token)])
def ingest_health(payload: dict):
    return {"accepted": True}

@router.post("/ingest/env", dependencies=[Depends(require_buoy_token)])
def ingest_env(payload: dict):
    return {"accepted": True}


@router.post("/ingest/wave_stats", dependencies=[Depends(require_buoy_token)])
def ingest_wave_stats(payload: dict):
    return {"accepted": True}


@router.post("/ingest/acoustic_meta", dependencies=[Depends(require_buoy_token)])
def ingest_acoustic_meta(payload: dict):
    return {"accepted": True}


@router.get("/nodes")
def list_nodes():
    # v1 stub
    return [{"node_id": "ucl-buoy", "display_name": "UCL Buoy"}]


@router.get("/nodes/{node_id}/snapshots/latest")
def latest_snapshots(node_id: str):
    # v1 stub: dashboard-friendly aggregate
    return {
        "node_id": node_id,
        "telemetry": None,
        "env": None,
        "health": None,
        "acoustics": None,
        "ts": datetime.now(timezone.utc).isoformat(),
    }

