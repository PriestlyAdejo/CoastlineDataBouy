# Pi HDMI Recovery and Tailscale

Use when the Pi is not reachable over Tailscale (4G/Wi-Fi/Tailscale issues).

## HDMI console kit

- micro-HDMI cable/adapter, monitor, USB keyboard
- Pi power supply, SSD mounted at `/mnt/ssd/buoy` (preferred) or `/mnt/harddrive` / `/mnt/harddrive/buoy` — set `BUOY_DATA_DIR` in `/etc/buoy/buoy.env` to match

## Quick recovery steps

1. Boot Pi, login locally
2. Run: `edge/pi/scripts/pi_first_boot_check.sh`
3. Run: `edge/pi/scripts/pi_pitalk_4g_bringup.sh` (4G + connectivity report)
4. Run: `edge/pi/scripts/pi_gnss_probe.sh` (if location/GPS is wrong or missing)
5. Run: `edge/pi/scripts/pi_network_check.sh`
6. Run: `edge/pi/scripts/pi_tailscale_check.sh`
7. If Tailscale down: `sudo tailscale up`
8. If env missing: `edge/pi/scripts/apply_handover_env.sh`
9. Restart services: `edge/pi/scripts/restart_handover_services.sh`

## PiTalk power note

PiTalk HAT needs serial enabled on the Raspberry Pi and the module powered with **PWRKEY for 3–4 seconds** at boot. USB mode may expose `ttyUSB*` ports (e.g. `ttyUSB3`). Do not assume `/dev/serial0` is GNSS — on Raspberry Pi it may be Bluetooth/UART.

## Edit backend / 4G / GNSS targets

```bash
sudo nano /etc/buoy/buoy.env
```

Common settings:

```bash
BUOY_BACKEND_API_BASE=http://<laptop-tailscale-ip>:8000/v1
BUOY_4G_APN=your.apn.here
BUOY_ENABLE_LOCATION_IP_FALLBACK=1
# Set only after pi_gnss_probe.sh confirms NMEA on a port:
# BUOY_GNSS_PORT=/dev/ttyUSB3
# BUOY_GNSS_MODE=nmea
# Or for Quectel AT GNSS:
# BUOY_GNSS_MODE=quectel_at
# BUOY_GNSS_AT_PORT=/dev/ttyUSB2
```

```bash
sudo systemctl restart buoy-uploader buoy-healthd buoy-gnssd
```

## Wi-Fi nudge before 4G

If the modem is invisible until Wi-Fi is on:

```bash
sudo rfkill unblock wifi
nmcli radio wifi on
edge/pi/scripts/pi_pitalk_4g_bringup.sh
```

## Expected Tailscale IPs (handover)

| Node | IP |
|------|-----|
| Laptop | 100.97.101.91 |
| Pi (ucl-buoy) | 100.89.114.62 |

Update `/etc/buoy/buoy.env` if your laptop Tailscale IP changes.
