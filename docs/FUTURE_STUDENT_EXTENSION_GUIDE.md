# Future Student Extension Guide

## Add a new sensor (Pi)

1. Add service under `edge/pi/src/buoy/services/`
2. Write JSONL under `/mnt/ssd/buoy/telemetry/`
3. Register artifact kind in `uploader.py` `KIND_TO_ENDPOINT`
4. Add env vars to `edge/pi/config/buoy.env.example`
5. Add systemd unit in `edge/pi/systemd/`

## Add a new backend payload

1. Add ingest route in `apps/api/src/nereus_api/api.py`
2. Add SQLAlchemy model + migration if persisting
3. Merge into `GET /nodes/{id}/snapshots/latest` if dashboard-visible
4. Document in `docs/API_DATA_CONTRACTS.md`

## Add a new dashboard panel

1. Add route in `src/app/routes.tsx`
2. Read live data via `useLiveNode()` — never inject Brighton coords in live mode
3. Label estimated/uncalibrated/replay data explicitly

## Run on another laptop

1. Clone repo, install Python/Node/Docker
2. `docker compose -f docker/compose.backend.yml up -d`
3. Copy `edge/pi/config/buoy.env.handover.example` → Pi `/etc/buoy/buoy.env` with your laptop Tailscale IP
4. Follow `docs/FRIDAY_HANDOVER_CHECKLIST.md`
