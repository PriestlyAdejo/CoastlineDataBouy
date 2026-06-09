#!/usr/bin/env bash
# Log-only connectivity watchdog (no reboot unless BUOY_WATCH_REBOOT=1).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/handover_common.sh
source "${SCRIPT_DIR}/lib/handover_common.sh"
handover_load_env

LOG_DIR="${BUOY_BASE_DIR:-/var/lib/buoy}/log"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/connectivity_watch.log"

INET=offline
TS=offline
BE=offline
UPLOAD=unknown

handover_ping_inet && INET=online
[[ -n "$(tailscale ip -4 2>/dev/null || true)" ]] && TS=online
handover_curl_ok "${API_BASE}/healthz" 8 && BE=online

CURSOR="${BUOY_BASE_DIR:-/var/lib/buoy}/run/uploader_cursor.json"
if [[ -f "$CURSOR" ]]; then
  if grep -q last_upload_ok_iso "$CURSOR" 2>/dev/null; then
    UPLOAD=ok
  else
    UPLOAD=spooling
  fi
fi

MSG="$(date -Is) inet=${INET} tailscale=${TS} backend=${BE} upload=${UPLOAD} api=${API_BASE}"
echo "$MSG" | tee -a "$LOG_FILE"

if [[ "${BUOY_WATCH_REBOOT:-0}" == "1" && "$INET" == "offline" && "$TS" == "offline" ]]; then
  echo "BUOY_WATCH_REBOOT=1 and network down — reboot not implemented by default (log only)"
fi
