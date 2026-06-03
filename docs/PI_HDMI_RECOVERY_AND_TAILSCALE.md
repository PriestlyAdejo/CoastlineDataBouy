# Pi HDMI Recovery and Tailscale

Use when the Pi is not reachable over Tailscale (4G/Wi-Fi/Tailscale issues).

## HDMI console kit

- micro-HDMI cable/adapter, monitor, USB keyboard
- Pi power supply, SSD mounted at `/mnt/ssd/buoy`

## Quick recovery steps

1. Boot Pi, login locally
2. Run: `edge/pi/scripts/pi_first_boot_check.sh`
3. Run: `edge/pi/scripts/pi_network_check.sh`
4. Run: `edge/pi/scripts/pi_tailscale_check.sh`
5. If Tailscale down: `sudo tailscale up`
6. If env missing: `edge/pi/scripts/apply_handover_env.sh`
7. Restart services: `edge/pi/scripts/restart_handover_services.sh`

## Edit backend target

```bash
sudo nano /etc/buoy/buoy.env
# BUOY_BACKEND_API_BASE=http://<laptop-tailscale-ip>:8000/v1
sudo systemctl restart buoy-uploader buoy-healthd
```

## Expected Tailscale IPs (handover)

| Node | IP |
|------|-----|
| Laptop | 100.97.101.91 |
| Pi (ucl-buoy) | 100.89.114.62 |

Update `/etc/buoy/buoy.env` if your laptop Tailscale IP changes.
