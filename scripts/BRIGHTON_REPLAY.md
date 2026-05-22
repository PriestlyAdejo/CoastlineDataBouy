# Brighton Marina Field-Test Replay

Time-indexed replay for **2026-05-01** on node **ucl-buoy**. One shared replay engine (Python) + one shared replay clock (frontend).

## Enable

```js
localStorage.setItem("nereus.apiBaseUrl", "http://127.0.0.1:8000/v1");
localStorage.setItem("nereus.demoMode", "brighton-marina-2026-05-01");
localStorage.setItem("nereus.replayTime", "2026-05-01T13:17:00+01:00");
localStorage.setItem("nereus.replayPaused", "false");
localStorage.setItem("nereus.replaySpeed", "1");
location.reload();
```

## Disable

```js
localStorage.removeItem("nereus.demoMode");
localStorage.removeItem("nereus.apiBaseUrl");
localStorage.removeItem("nereus.replayTime");
localStorage.removeItem("nereus.replayPaused");
localStorage.removeItem("nereus.replaySpeed");
localStorage.removeItem("nereus.replayPhase");
location.reload();
```

## Before acceptance testing

**Stop all old continuous seeders** (any background `seed_brighton_marina_replay.py` without `--once`). Otherwise stale live replay overwrites `GET /v1/nodes/ucl-buoy/snapshots/latest` and fixed `--at` checks will fail.

## Seeder modes

```bash
# A) Live replay (advances test timeline)
python scripts/seed_brighton_marina_replay.py --input scripts/brighton_marina_seed_input.json --api-base http://127.0.0.1:8000/v1 --token STRONG_UPLOAD_TOKEN_69420 --interval 5 --mode live-replay

# B) Exact timestamp
python scripts/seed_brighton_marina_replay.py --input scripts/brighton_marina_seed_input.json --api-base http://127.0.0.1:8000/v1 --token STRONG_UPLOAD_TOKEN_69420 --at "2026-05-01T13:17:00+01:00" --once

# C) Exact phase (phase start)
python scripts/seed_brighton_marina_replay.py --input scripts/brighton_marina_seed_input.json --api-base http://127.0.0.1:8000/v1 --token STRONG_UPLOAD_TOKEN_69420 --phase anchored_disturbed --once

# D) From phase with live ticks
python scripts/seed_brighton_marina_replay.py --input scripts/brighton_marina_seed_input.json --api-base http://127.0.0.1:8000/v1 --token STRONG_UPLOAD_TOKEN_69420 --start-phase free_floating --interval 5 --mode live-replay

# Export report JSON (same engine)
python scripts/seed_brighton_marina_replay.py --input scripts/brighton_marina_seed_input.json --api-base http://127.0.0.1:8000/v1 --token STRONG_UPLOAD_TOKEN_69420 --at "2026-05-01T13:17:00+01:00" --once --export-report scripts/brighton_replay_report.json
```

## Verify snapshot

```bash
curl -s http://127.0.0.1:8000/v1/nodes/ucl-buoy/snapshots/latest
```

Expect `replay.phase_id`, `replay.test_time_local`, GPS near **50.80675, -0.12635**, all five snapshot sections non-null.

## Frontend controls

Top bar **Replay** panel when Brighton mode is on:

- Pause / resume
- Phase dropdown (jumps timeline + localStorage `nereus.replayTime`)
- Speed: 1×, 5×, 30×, 60×
- Quick jumps: Start, Free-float, Anchored, Boat circling

Pages read **one** `BrightonReplayProvider`: API snapshots when seeder runs; local engine fills gaps when API is offline.

## Coordinates

| Point | Lat | Lon |
|-------|-----|-----|
| Marina reference | 50.808166 | -0.124052 |
| Test point | **50.80675** | **-0.12635** |

## Evidence capture (MECH0073)

Automated screenshots, API JSON, and logs for report figures and validation. Output: `screenshots/latest/` (mirrored from `screenshots/runs/<timestamp>/`).

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

Or:

```bat
scripts\capture_dashboard_evidence_windows.bat
```

Options: `--headed`, `--no-demo`, `--frontend http://localhost:5173`, `--api http://127.0.0.1:8000/v1`, `--delay 2500`, `--map-delay 5000`.

See `screenshots/latest/DASHBOARD_EVIDENCE_README.md` after each run.
