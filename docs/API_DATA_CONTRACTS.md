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
