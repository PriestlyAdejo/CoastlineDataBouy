# Friday Handover Checklist

## What this demonstrates

- Pi collects telemetry, GNSS heartbeat, health, and hydrophone WAV/metadata on SSD
- Laptop backend ingests over Tailscale; dashboard shows **LIVE API** (not Brighton replay)
- Honest labels: no-fix GNSS, approximate IP fallback, uncalibrated acoustics, `file_on_pi_not_synced`

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

## Pi (SSH or HDMI)

```bash
tailscale status
tailscale ip -4
curl http://100.97.101.91:8000/v1/healthz
edge/pi/scripts/pi_handover_acceptance.sh
ls -lh /mnt/ssd/buoy/raw/audio
ls -lh /mnt/ssd/buoy/raw/audio_meta
tail -n 5 /mnt/ssd/buoy/telemetry/gnss.jsonl
tail -n 5 /mnt/ssd/buoy/telemetry/health.jsonl
sudo journalctl -u buoy-uploader -n 100 --no-pager
```

## Dashboard

- [ ] Header shows **LIVE API** (not BRIGHTON REPLAY)
- [ ] No Brighton/Clyde coordinates on map in live mode
- [ ] Location banner: Live GNSS fix / Approximate IP fallback / No live GNSS fix yet
- [ ] Files page shows `file_on_pi_not_synced` when WAV only on Pi
- [ ] Hydrophone banner: recording to SSD; SPL uncalibrated
- [ ] Docs page links to runbooks
- [ ] Toggle **Readable** in header for projector contrast

## Evidence capture

```bat
node scripts/capture_dashboard_evidence.mjs --mode handover --api http://127.0.0.1:8000/v1
```

Output: `screenshots/latest/HANDOVER_ACCEPTANCE_SUMMARY.md`

## Known limitations

- 4G must be proven after reboot before unattended deployment
- Battery on dashboard is **not** measured unless serial `pack_v`/`soc_pct` present
- Acoustic SPL is uncalibrated unless calibrated
- Raw audio is stored on Pi SSD, not streamed live
- Cloud deployment is a **future** presentation stage (same API can move to a cloud host)
