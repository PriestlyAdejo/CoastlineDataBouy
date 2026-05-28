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
