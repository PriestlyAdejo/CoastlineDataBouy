# Friday Handover Checklist

## What this demonstrates

- Pi collects telemetry, GNSS heartbeat, health, and hydrophone WAV/metadata on SSD
- Laptop backend ingests over Tailscale; dashboard shows **LIVE API** (not Brighton replay)
- Honest labels: Live GNSS fix / GNSS present waiting for fix / Approximate IP fallback / No GNSS device detected
- Uncalibrated acoustics, `file_on_pi_not_synced`

## Laptop (Windows)

```bat
docker compose -f docker\compose.backend.yml up -d
scripts\run_handover_backend_tailscale_windows.bat
scripts\run_handover_frontend_windows.bat
curl http://127.0.0.1:8000/v1/healthz
curl http://127.0.0.1:8000/v1/nodes/ucl-buoy/snapshots/latest
curl http://127.0.0.1:8000/v1/files
```

Known Tailscale laptop IP (update if changed): `100.97.101.91`

Handover dashboard URL (forces readable high-contrast mode):

```
http://127.0.0.1:5173/?handover=1&apiBase=http://127.0.0.1:8000/v1&readable=1
```

## Pi (SSH or HDMI)

```bash
tailscale status
tailscale ip -4
curl http://100.97.101.91:8000/v1/healthz

# 4G / PiTalk bring-up (safe to re-run)
edge/pi/scripts/pi_pitalk_4g_bringup.sh
# Optional: prefer 4G route for test only
edge/pi/scripts/pi_pitalk_4g_bringup.sh --prefer-4g

# GNSS probe — find true NMEA or Quectel AT port (does not permanently enable GNSS)
edge/pi/scripts/pi_gnss_probe.sh
# Only after confirming AT GNSS works outdoors:
edge/pi/scripts/pi_gnss_probe.sh --enable-gnss

edge/pi/scripts/pi_handover_acceptance.sh
# Preferred SSD path is /mnt/ssd/buoy; this Pi may use /mnt/harddrive or /mnt/harddrive/buoy — set BUOY_DATA_DIR in /etc/buoy/buoy.env
DATA="${BUOY_DATA_DIR:-/mnt/ssd/buoy}"
ls -lh "${DATA}/raw/audio"
ls -lh "${DATA}/raw/audio_meta"
tail -n 5 "${DATA}/telemetry/gnss.jsonl"
tail -n 5 "${DATA}/telemetry/health.jsonl"
cat "${DATA}/telemetry/connectivity_report.json"
cat "${DATA}/telemetry/gnss_probe_report.json"
sudo journalctl -u buoy-uploader -n 100 --no-pager
```

### If PiTalk only works after Wi-Fi is on

Some PiTalk/Quectel pucks need the Wi-Fi radio enabled first. The bring-up script runs:

- `rfkill unblock wifi`
- `nmcli radio wifi on` (if NetworkManager is present)

This does **not** disable Wi-Fi — it only nudges the radio on before probing 4G.

### If 4G works but GPS does not

1. Run `pi_gnss_probe.sh` and read `gnss_probe_report.json`
2. If NMEA is found on a port, set only that port in `/etc/buoy/buoy.env`:
   - `BUOY_GNSS_PORT=/dev/ttyUSB3` (example — use probe recommendation)
   - `BUOY_GNSS_MODE=nmea`
3. If only AT GNSS responds, set:
   - `BUOY_GNSS_MODE=quectel_at`
   - `BUOY_GNSS_AT_PORT=/dev/ttyUSB2` (example)
4. If no GNSS is found, leave IP fallback enabled:
   - `BUOY_ENABLE_LOCATION_IP_FALLBACK=1`
   - Dashboard will show **Approximate IP fallback** (honest, not fake GPS)

## Dashboard

- [ ] Header shows **LIVE API** (not BRIGHTON REPLAY)
- [ ] Readable mode active via handover URL or **Readable** toggle (high contrast, OS-independent)
- [ ] No Brighton/Clyde coordinates on map in live mode
- [ ] Location banner: Live GNSS fix / GNSS present waiting for fix / Approximate IP fallback / No GNSS device detected
- [ ] System Health shows connectivity (Tailscale, default route, modem detected)
- [ ] Files page shows `file_on_pi_not_synced` when WAV only on Pi
- [ ] Hydrophone banner: recording to SSD; SPL uncalibrated
- [ ] Docs page links to runbooks

## Evidence capture

```bat
node scripts/capture_dashboard_evidence.mjs --mode handover --api http://127.0.0.1:8000/v1
```

Output: `screenshots/latest/HANDOVER_ACCEPTANCE_SUMMARY.md`

## Known limitations

- 4G must be proven after reboot before unattended deployment (`pi_pitalk_4g_bringup.sh`)
- True GNSS may need outdoor sky view; indoor = no fix is expected
- Battery on dashboard is **not** measured unless serial `pack_v`/`soc_pct` present
- Acoustic SPL is uncalibrated unless calibrated
- Raw audio is stored on Pi SSD, not streamed live
- Cloud deployment is a **future** presentation stage (same API can move to a cloud host)
