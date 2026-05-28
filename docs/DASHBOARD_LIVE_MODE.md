# Dashboard Live Mode

Modes shown in UI:
- `LIVE API`
- `BRIGHTON REPLAY`
- `MOCK FALLBACK`
- `API OFFLINE`
- `STALE LIVE DATA`

Live mode behavior:
- Polls `/v1/nodes/ucl-buoy/snapshots/latest` every ~2.5s.
- Uses real telemetry/env/health/acoustics/wave stats when available.
- Map shows real GNSS where present.
- If fallback location is used, it is marked approximate.
- Brighton replay is preserved and only enabled by demo mode.
