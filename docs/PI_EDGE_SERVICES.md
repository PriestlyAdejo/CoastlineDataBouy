# Pi Edge Services

Core services:
- `buoy-seriald`
- `buoy-ds18b20d`
- `buoy-gnssd`
- `buoy-audio-capture`
- `buoy-wave-derive` (+ timer)
- `buoy-healthd`
- `buoy-uploader`

Install:

```bash
edge/pi/scripts/install_services.sh
```

Check status:

```bash
edge/pi/scripts/pi_live_status.sh
```

Restart all handover services:

```bash
edge/pi/scripts/restart_handover_services.sh
```

Environment file standard:
- `/etc/buoy/buoy.env`
- Examples: `edge/pi/config/buoy.env.handover.example`, `buoy.env.deployment.example`
- Apply handover profile: `edge/pi/scripts/apply_handover_env.sh`

Handover diagnostics:
- `edge/pi/scripts/pi_first_boot_check.sh`
- `edge/pi/scripts/pi_network_check.sh`
- `edge/pi/scripts/pi_tailscale_check.sh`
- `edge/pi/scripts/pi_handover_acceptance.sh`
- `edge/pi/scripts/pi_connectivity_watch.sh`

Uploader logs `upload_mode=spooling_local_only` when backend is unreachable; local JSONL/WAV continue on SSD.
