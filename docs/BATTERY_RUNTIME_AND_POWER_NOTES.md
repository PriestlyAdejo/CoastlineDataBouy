# Battery Runtime and Power Notes

## Current assumptions

- Dashboard battery fields appear only when serial telemetry provides `pack_v` / `soc_pct`
- `battery_source`: `measured` | `estimated` | `not_available`
- Without a calibrated battery circuit, **do not** present SOC as measured

## Controlled 2–4 hour runtime test

| Field | Record |
|-------|--------|
| Start time | |
| End time | |
| Battery voltage (if available) | |
| Services running | serial, gnss, audio, uploader, health |
| Network mode | 4G / Wi-Fi / Tailscale |
| Audio chunk length | `BUOY_AUDIO_CHUNK_S` |
| Storage written | `du -sh /mnt/ssd/buoy` |
| Backend heartbeat continued | health.jsonl + curl healthz |

## Proper calibrated battery circuit (future)

- Pack voltage sense with known divider ratio
- Optional coulomb-counting or fuel gauge IC
- Map readings into serial or health payload with `battery_source: measured`
