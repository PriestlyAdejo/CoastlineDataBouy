# Dashboard evidence capture

Generated: 2026-05-22T08:44:49.276Z

## Run this capture

```bat
npm run capture:evidence
```

Or headed (visible browser):

```bat
npm run capture:evidence:headed
```

Or:

```bat
scripts\capture_dashboard_evidence_windows.bat
```

## Full stack (Windows, 5 terminals)

**Terminal 1 — database**

```bat
docker compose -f docker\compose.backend.yml up -d
```

**Terminal 2 — API migrations + backend**

```bat
cd apps\api
python -m alembic -c alembic.ini upgrade head
cd ..\..
scripts\run_backend_windows.bat
```

**Terminal 3 — frontend**

```bat
scripts\run_frontend_windows.bat
```

**Terminal 4 — Brighton live replay seeder**

```bat
python scripts\seed_brighton_marina_replay.py --input scripts\brighton_marina_seed_input.json --api-base http://127.0.0.1:8000/v1 --token STRONG_UPLOAD_TOKEN_69420 --interval 5 --mode live-replay
```

**Terminal 5 — evidence capture**

```bat
npm run capture:evidence
```

See also [scripts/BRIGHTON_REPLAY.md](../../scripts/BRIGHTON_REPLAY.md).

## Output folders

| Path | Purpose |
|------|---------|
| `screenshots/latest/` | Latest run (overwritten each capture) |
| `screenshots/runs/<timestamp>/` | Archived run |
| `pages/*.png` | Full-page UI evidence per route |
| `api/*.json` | Backend API responses and snapshot delta |
| `logs/*.jsonl` | Network, console, summary |

This run folder: `screenshots/runs/2026-05-22T08-42-34`

## Brighton replay mode

Before screenshots, the script sets:

- `nereus.apiBaseUrl` = `http://127.0.0.1:8000/v1`
- `nereus.demoMode` = `brighton-marina-2026-05-01`

Disable demo for Clyde UI: `node scripts/capture_dashboard_evidence.mjs --no-demo`

## What each screenshot proves

Each PNG shows the operational dashboard for that route with replay chrome, live metrics, and charts/map as rendered at capture time.

## What each API file proves

| File | Proves |
|------|--------|
| `healthz.json` | API process reachable |
| `nodes.json` | Node registry |
| `ucl-buoy-latest-snapshot.json` | Merged latest payload for the buoy |
| `ucl-buoy-latest-snapshot-t0.json` / `t10.json` | Snapshot stability / live seeder movement |
| `snapshot-delta.json` | Field-level changes over 10 seconds |
| `openapi.json` | API schema (if exposed) |

## Data flow

The dashboard reads `GET /v1/nodes/ucl-buoy/snapshots/latest` (see `dashboard_data_flow.mmd`). Pages bind via `useDeploymentView()` when Brighton demo is enabled.
