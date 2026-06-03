#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/etc/buoy/buoy.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

DATA_DIR="${BUOY_DATA_DIR:-/mnt/ssd/buoy}"
API_BASE="${BUOY_BACKEND_API_BASE:-http://127.0.0.1:8000/v1}"
NODE_ID="${BUOY_NODE_ID:-ucl-buoy}"

echo "time: $(date -Is)"
echo "node_id: ${NODE_ID}"
echo "hostname: $(hostname)"
echo "tailscale: $(tailscale status --json 2>/dev/null | jq -r '.Self.TailscaleIPs[0] // "unknown"' 2>/dev/null || echo unknown)"
echo "backend_api_base: ${API_BASE}"
echo "backend_health: $(curl -sS --max-time 5 "${API_BASE}/healthz" || echo failed)"
echo "ssd_mount_ok: $(mount | grep -q "${DATA_DIR}" && echo true || echo false)"
df -h "${DATA_DIR}" 2>/dev/null || true
echo "serial_port_selected: ${BUOY_SERIAL_PORT:-auto}"
echo "latest_serial: $(tail -n 1 "${DATA_DIR}/telemetry/serial_telemetry.jsonl" 2>/dev/null || echo none)"
echo "gnss_port_selected: ${BUOY_GNSS_PORT:-auto}"
echo "latest_gnss: $(tail -n 1 "${DATA_DIR}/telemetry/gnss.jsonl" 2>/dev/null || echo none)"
echo "latest_ds18b20: $(tail -n 1 "${DATA_DIR}/telemetry/env.jsonl" 2>/dev/null || echo none)"
echo "audio_device: ${BUOY_AUDIO_DEVICE:-auto}"
echo "latest_wav: $(ls -1t "${DATA_DIR}/raw/audio"/*.wav 2>/dev/null | head -n 1 || echo none)"
echo "latest_audio_meta: $(ls -1t "${DATA_DIR}/raw/audio_meta"/*.json 2>/dev/null | head -n 1 || echo none)"
echo "latest_wave_stats: $(tail -n 1 "${DATA_DIR}/telemetry/wave_stats.jsonl" 2>/dev/null || echo none)"
for svc in buoy-seriald buoy-ds18b20d buoy-gnssd buoy-audio-capture buoy-wave-derive buoy-healthd buoy-uploader; do
  echo "${svc}: $(systemctl is-active "$svc" 2>/dev/null || echo unknown)"
done
echo "snapshot_probe: $(curl -sS --max-time 5 "${API_BASE}/nodes/${NODE_ID}/snapshots/latest" || echo failed)"
