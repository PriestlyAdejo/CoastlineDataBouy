# Brighton Marina replay (2026-05-01)

## Enable demo mode (browser)

```js
localStorage.setItem("nereus.apiBaseUrl", "http://127.0.0.1:8000/v1");
localStorage.setItem("nereus.demoMode", "brighton-marina-2026-05-01");
location.reload();
```

## Disable demo mode

```js
localStorage.removeItem("nereus.demoMode");
localStorage.removeItem("nereus.apiBaseUrl");
location.reload();
```

## Seed replay data

```bash
python scripts/seed_brighton_marina_replay.py --input scripts/brighton_marina_seed_input.json --api-base http://127.0.0.1:8000/v1 --token STRONG_UPLOAD_TOKEN_69420 --once
```

Loop every 5 seconds:

```bash
python scripts/seed_brighton_marina_replay.py --input scripts/brighton_marina_seed_input.json --api-base http://127.0.0.1:8000/v1 --token STRONG_UPLOAD_TOKEN_69420 --interval 5
```

Optional WAV analysis:

```bash
python scripts/seed_brighton_marina_replay.py --input scripts/brighton_marina_seed_input.json --api-base http://127.0.0.1:8000/v1 --token STRONG_UPLOAD_TOKEN_69420 --once --hydrophone-path path/to/recording.wav
```

## Verify API

```bash
curl http://127.0.0.1:8000/v1/nodes/ucl-buoy/snapshots/latest
```

Expect non-null `health`, `env`, `telemetry`, `acoustics` (with `display_metrics` and `provenance`), and `wave_stats` (object or null).
