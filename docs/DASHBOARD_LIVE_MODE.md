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

Location labels (live only):
- **Live GNSS fix** — `location.quality == fix`
- **Approximate IP fallback** — `source == ip_fallback` or `quality == approximate`
- **No live GNSS fix yet** — no coordinates or `quality == no_fix`

Never show Brighton marina coordinates unless `nereus.demoMode` is Brighton replay.
