#!/usr/bin/env bash
# Shared helpers for Pi handover diagnostic scripts (safe to source).

HANDOVER_PASS=0
HANDOVER_WARN=0
HANDOVER_FAIL=0

handover_load_env() {
  ENV_FILE="${ENV_FILE:-/etc/buoy/buoy.env}"
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$ENV_FILE"
    set +a
  fi
  export DATA_DIR="${BUOY_DATA_DIR:-/mnt/ssd/buoy}"
  export API_BASE="${BUOY_BACKEND_API_BASE:-http://127.0.0.1:8000/v1}"
  export NODE_ID="${BUOY_NODE_ID:-ucl-buoy}"
  export EXPECTED_PI_TS_IP="${EXPECTED_PI_TS_IP:-100.89.114.62}"
  export EXPECTED_LAPTOP_TS_IP="${EXPECTED_LAPTOP_TS_IP:-100.97.101.91}"
}

handover_pass() { echo "PASS: $*"; HANDOVER_PASS=$((HANDOVER_PASS + 1)); }
handover_warn() { echo "WARN: $*"; HANDOVER_WARN=$((HANDOVER_WARN + 1)); }
handover_fail() { echo "FAIL: $*"; HANDOVER_FAIL=$((HANDOVER_FAIL + 1)); }

handover_curl_ok() {
  local url="$1"
  curl -fsS --max-time "${2:-5}" "$url" >/dev/null 2>&1
}

handover_ping_inet() {
  ping -c 1 -W 3 8.8.8.8 >/dev/null 2>&1
}

handover_repo_root() {
  if [[ -n "${BUOY_REPO_ROOT:-}" && -d "${BUOY_REPO_ROOT}/.git" ]]; then
    echo "$BUOY_REPO_ROOT"
    return
  fi
  for d in /opt/buoy/CoastlineDataBouy "$HOME/CoastlineDataBouy" "$(pwd)"; do
    if [[ -d "$d/.git" ]]; then
      echo "$d"
      return
    fi
  done
  echo ""
}

handover_print_summary() {
  echo ""
  echo "========== HANDOVER SUMMARY =========="
  echo "PASS=${HANDOVER_PASS} WARN=${HANDOVER_WARN} FAIL=${HANDOVER_FAIL}"
  if [[ "$HANDOVER_FAIL" -gt 0 ]]; then
    echo "handover_readiness=FAIL"
  elif [[ "$HANDOVER_WARN" -gt 0 ]]; then
    echo "handover_readiness=WARN"
  else
    echo "handover_readiness=PASS"
  fi
}
