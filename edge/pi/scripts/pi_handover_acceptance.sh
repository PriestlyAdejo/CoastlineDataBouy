#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/handover_common.sh
source "${SCRIPT_DIR}/lib/handover_common.sh"
handover_load_env

echo "========== PI HANDOVER ACCEPTANCE =========="

if handover_ping_inet; then handover_pass "internet available"; else handover_fail "internet unavailable"; fi

TS_IP="$(tailscale ip -4 2>/dev/null || true)"
if [[ -n "$TS_IP" ]]; then handover_pass "tailscale online (${TS_IP})"; else handover_fail "tailscale offline"; fi

if handover_curl_ok "${API_BASE}/healthz" 10; then
  handover_pass "backend reachable"
else
  handover_fail "backend unreachable (${API_BASE})"
fi

if [[ -d "${DATA_DIR}" ]] && touch "${DATA_DIR}/.accept_test" 2>/dev/null; then
  rm -f "${DATA_DIR}/.accept_test"
  handover_pass "SSD mounted and writable"
else
  handover_fail "SSD not writable at ${DATA_DIR}"
fi

SERIAL="${DATA_DIR}/telemetry/serial_telemetry.jsonl"
if [[ -f "$SERIAL" ]]; then
  MTIME=$(stat -c %Y "$SERIAL" 2>/dev/null || stat -f %m "$SERIAL" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  if [[ $((NOW - MTIME)) -lt 120 ]]; then
    handover_pass "serial telemetry updating"
  else
    handover_warn "serial file stale (>120s) — check buoy-seriald or no serial source"
  fi
else
  handover_warn "no serial telemetry file — OK if no serial sensor connected"
fi

GNSS="${DATA_DIR}/telemetry/gnss.jsonl"
if [[ -f "$GNSS" ]]; then
  LAST=$(tail -n 1 "$GNSS" 2>/dev/null || true)
  if echo "$LAST" | grep -q '"quality":"no_fix"\|"reason"'; then
    handover_warn "GNSS reporting no-fix (expected indoors) — payload present"
  else
    handover_pass "GNSS file updating with fix or heartbeat"
  fi
else
  handover_fail "no GNSS jsonl — check buoy-gnssd"
fi

HEALTH="${DATA_DIR}/telemetry/health.jsonl"
if [[ -f "$HEALTH" ]]; then
  handover_pass "health JSONL present"
else
  handover_fail "health JSONL missing"
fi

AUDIO_DIR="${DATA_DIR}/raw/audio"
META_DIR="${DATA_DIR}/raw/audio_meta"
if [[ -d "$AUDIO_DIR" && -d "$META_DIR" ]]; then
  RECENT=$(find "$META_DIR" -name '*.json' -mmin -30 2>/dev/null | head -n 1 || true)
  if [[ -n "$RECENT" ]]; then
    handover_pass "recent audio metadata on SSD"
  else
    handover_warn "audio paths exist but no metadata in last 30 min"
  fi
else
  handover_fail "audio directories missing"
fi

CURSOR="${BUOY_BASE_DIR:-/var/lib/buoy}/run/uploader_cursor.json"
if [[ -f "$CURSOR" ]]; then
  if grep -q last_upload_ok_iso "$CURSOR" 2>/dev/null; then
    handover_pass "uploader recent success recorded"
  else
    handover_warn "uploader spooling locally (no recent success in cursor)"
  fi
else
  handover_warn "uploader cursor not found yet"
fi

for svc in buoy-gnssd buoy-healthd buoy-uploader buoy-audio-capture; do
  STATE=$(systemctl is-active "$svc" 2>/dev/null || echo unknown)
  if [[ "$STATE" == "active" ]]; then
    handover_pass "service ${svc} active"
  else
    handover_fail "service ${svc} state=${STATE}"
  fi
done

handover_print_summary
