#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/handover_common.sh
source "${SCRIPT_DIR}/lib/handover_common.sh"
handover_load_env

echo "========== PI FIRST BOOT CHECK =========="
handover_report_data_dirs
echo "date/time: $(date -Is)"
echo "hostname: $(hostname)"
echo "user: $(whoami)"
echo "python: $(python3 --version 2>&1 || echo missing)"

REPO="$(handover_repo_root)"
if [[ -n "$REPO" ]]; then
  echo "repo_path: $REPO"
  echo "git_branch: $(git -C "$REPO" branch --show-current 2>/dev/null || echo unknown)"
  echo "git_commit: $(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo unknown)"
else
  echo "repo_path: (not found)"
fi

if [[ -f /etc/buoy/buoy.env ]]; then
  echo "buoy.env: present"
else
  echo "buoy.env: MISSING at /etc/buoy/buoy.env"
fi

if mount | grep -q "${DATA_DIR}"; then
  echo "ssd_mount: ok (${DATA_DIR})"
else
  echo "ssd_mount: not mounted (${DATA_DIR})"
  if mount | grep -q "${HANDOVER_ALT_MOUNT}"; then
    echo "ssd_mount_note: alternate mount ${HANDOVER_ALT_MOUNT} detected — set BUOY_DATA_DIR if services use a different path"
  fi
fi

if handover_dir_writable "${DATA_DIR}"; then
  echo "ssd_writable: yes (${DATA_DIR})"
elif handover_dir_writable "${HANDOVER_ALT_DATA_DIR}" || handover_dir_writable "${HANDOVER_ALT_MOUNT}"; then
  echo "ssd_writable: alternate path available (preferred ${HANDOVER_PREFERRED_DATA_DIR} missing); set BUOY_DATA_DIR"
else
  echo "ssd_writable: no"
fi

echo "tailscale_status:"
tailscale status 2>/dev/null || echo "tailscale unavailable"
echo "tailscale_ip: $(tailscale ip -4 2>/dev/null || echo unknown)"

if handover_ping_inet; then
  echo "internet: reachable"
else
  echo "internet: unreachable"
fi

echo "backend_api_base: ${API_BASE}"
if handover_curl_ok "${API_BASE}/healthz"; then
  echo "backend_healthz: ok"
else
  echo "backend_healthz: failed"
fi

echo "--- systemd ---"
for svc in buoy-seriald buoy-ds18b20d buoy-gnssd buoy-audio-capture buoy-wave-derive buoy-healthd buoy-uploader; do
  echo "${svc}: $(systemctl is-active "$svc" 2>/dev/null || echo unknown)"
done

echo "--- latest local files ---"
echo "serial: $(tail -n 1 "${DATA_DIR}/telemetry/serial_telemetry.jsonl" 2>/dev/null || echo none)"
echo "gnss: $(tail -n 1 "${DATA_DIR}/telemetry/gnss.jsonl" 2>/dev/null || echo none)"
echo "env: $(tail -n 1 "${DATA_DIR}/telemetry/env.jsonl" 2>/dev/null || echo none)"
echo "health: $(tail -n 1 "${DATA_DIR}/telemetry/health.jsonl" 2>/dev/null || echo none)"
echo "latest_wav: $(ls -1t "${DATA_DIR}/raw/audio"/*.wav 2>/dev/null | head -n 1 || echo none)"
echo "latest_audio_meta: $(ls -1t "${DATA_DIR}/raw/audio_meta"/*.json 2>/dev/null | head -n 1 || echo none)"
