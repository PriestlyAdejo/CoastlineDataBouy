# SIM / 4G and Connectivity Notes

## Handover network

- Pi uploads to laptop backend over **Tailscale** (not public cloud for Friday)
- PiTalk 4G HAT (Quectel EG25-G family) provides internet when Wi-Fi unavailable
- Prove 4G registration after **reboot** before leaving Pi unattended

## APN configuration

Edit `/etc/buoy/buoy.env`:

```bash
BUOY_4G_APN=your.apn.here
BUOY_4G_USER=          # optional
BUOY_4G_PASSWORD=      # optional
```

If `BUOY_4G_APN` is missing, the bring-up script still runs diagnostics but skips connect attempts.

## PiTalk / 4G bring-up script

```bash
edge/pi/scripts/pi_pitalk_4g_bringup.sh
```

Safe to re-run. Does **not** destroy Wi-Fi. Does **not** reboot unless `--reboot-if-needed` is passed.

Options:

- `--prefer-4g` — temporarily lower 4G route metric for testing (Wi-Fi remains enabled)
- `--reboot-if-needed` — reboot only if diagnostics report FAIL

The script:

1. Nudges Wi-Fi radio on (`rfkill unblock wifi`, `nmcli radio wifi on`)
2. Detects Quectel modem via `lsusb`, `dmesg`, `ttyUSB*`, ModemManager
3. Creates/updates NetworkManager profile `buoy-4g` when APN is set (no duplicate profiles each run)
4. Verifies ping, HTTPS, Tailscale, and backend `healthz`
5. Writes `telemetry/connectivity_report.json`

## Wi-Fi must be on first (known quirk)

Some PiTalk pucks only enumerate or register after the Wi-Fi radio is enabled. If 4G is silent:

```bash
sudo rfkill unblock wifi
nmcli radio wifi on
nmcli radio all
nmcli device status
edge/pi/scripts/pi_pitalk_4g_bringup.sh
```

## GNSS vs 4G

4G data and GNSS are separate on the Quectel module. If 4G connects but the dashboard shows **Approximate IP fallback**:

```bash
edge/pi/scripts/pi_gnss_probe.sh
cat "${BUOY_DATA_DIR:-/mnt/ssd/buoy}/telemetry/gnss_probe_report.json"
```

Set `BUOY_GNSS_PORT` only after NMEA is confirmed on that port. For AT-only GNSS:

```bash
BUOY_GNSS_MODE=quectel_at
BUOY_GNSS_AT_PORT=/dev/ttyUSB2   # from probe report
```

Leave `BUOY_ENABLE_LOCATION_IP_FALLBACK=1` for handover if true GNSS is unavailable.

## Other diagnostics

```bash
edge/pi/scripts/pi_network_check.sh
edge/pi/scripts/pi_tailscale_check.sh
edge/pi/scripts/pi_connectivity_watch.sh
```

## Fill in for supervisors

See [HANDOVER_PARTS_COST_SIM_CHECKLIST.md](HANDOVER_PARTS_COST_SIM_CHECKLIST.md) for SIM provider, monthly cost, account owner, APN, and replacement plan.

## Future cloud stage

The same API and uploader can target a cloud-hosted backend for demos; Friday handover uses the laptop backend only.
