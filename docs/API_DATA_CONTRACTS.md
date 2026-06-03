# API Data Contracts (MVP)

## Ingest
- `POST /v1/ingest/telemetry`
- `POST /v1/ingest/env`
- `POST /v1/ingest/health`
- `POST /v1/ingest/wave_stats`
- `POST /v1/ingest/acoustic_meta`

Header:
- `X-Buoy-Token: <token>`

## Read
- `GET /v1/healthz`
- `GET /v1/nodes`
- `GET /v1/nodes/{node_id}/snapshots/latest`
- `GET /v1/files`
- `GET /v1/files/{file_id}`
- `GET /v1/files/{file_id}/download`
- `GET /v1/exports/latest_snapshot.json`
- `GET /v1/exports/telemetry.csv`
- `GET /v1/exports/environment.csv`
- `GET /v1/exports/health.csv`
- `GET /v1/exports/wave_stats.csv`

If file binary is unavailable on backend:
- `available=false`
- `status=file_on_pi_not_synced`

## Latest snapshot `location` object

`GET /v1/nodes/ucl-buoy/snapshots/latest` includes top-level `location` derived from latest telemetry GPS:

Fix example:
```json
{
  "location": {
    "lat": 50.82,
    "lon": -0.13,
    "source": "gnss",
    "quality": "fix",
    "fix_status": "3d",
    "satellites": 9,
    "hdop": 1.1,
    "timestamp": "2026-06-03T12:00:00Z"
  }
}
```

No-fix example:
```json
{
  "location": {
    "source": "gnss",
    "quality": "no_fix",
    "fix_status": "no_fix",
    "reason": "indoor_no_fix",
    "timestamp": "2026-06-03T12:00:00Z"
  }
}
```

Approximate IP fallback:
```json
{
  "location": {
    "lat": 51.5,
    "lon": -0.1,
    "source": "ip_fallback",
    "quality": "approximate",
    "fix_status": "approximate",
    "timestamp": "..."
  }
}
```
