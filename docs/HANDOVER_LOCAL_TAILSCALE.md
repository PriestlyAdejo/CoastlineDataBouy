# Handover: Local Laptop + Tailscale

This handover setup keeps everything local:
- Laptop runs backend, Postgres/MinIO containers, and dashboard.
- Pi uses 4G but reaches laptop API over Tailscale.
- Cloud deployment is not required for demo/handover.

## Laptop commands

```bat
docker compose -f docker\compose.backend.yml up -d
scripts\run_handover_backend_tailscale_windows.bat
scripts\run_handover_frontend_windows.bat
curl http://127.0.0.1:8000/v1/healthz
curl http://127.0.0.1:8000/v1/nodes/ucl-buoy/snapshots/latest
```

Expected:
- Health endpoint returns `{ "ok": true, ... }`.
- Snapshot endpoint returns object with telemetry/env/health/acoustics/wave_stats keys.

## Pi commands

```bash
curl http://<laptop-tailscale-host-or-ip>:8000/v1/healthz
sudo systemctl status buoy-seriald buoy-ds18b20d buoy-gnssd buoy-audio-capture buoy-healthd buoy-uploader
edge/pi/scripts/pi_live_status.sh
```

Expected:
- Health request succeeds over Tailscale.
- Core services are `active`.
- `pi_live_status.sh` prints latest telemetry/GNSS/env/wave lines and backend snapshot probe.

## Why this maps to future cloud

Only `BUOY_BACKEND_API_BASE` changes later.
Service and payload contracts remain the same, so cloud migration is mostly endpoint/infrastructure substitution.

## Troubleshooting

- Pi cannot reach laptop API:
  - Confirm Tailscale is up on both devices.
  - Start API on `0.0.0.0:8000`.
  - Allow firewall access on Windows private/Tailscale profile.
- Snapshot empty:
  - Check uploader and producer services on Pi.
  - Check token (`BUOY_UPLOAD_TOKEN` / `NEREUS_BUOY_UPLOAD_TOKEN`) match.
