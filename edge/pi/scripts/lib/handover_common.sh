#!/usr/bin/env bash
# Shared helpers for Pi handover diagnostic scripts (safe to source).

HANDOVER_PASS=0
HANDOVER_WARN=0
HANDOVER_FAIL=0

HANDOVER_PREFERRED_DATA_DIR="/mnt/ssd/buoy"
HANDOVER_ALT_DATA_DIR="/mnt/harddrive/buoy"
HANDOVER_ALT_MOUNT="/mnt/harddrive"

handover_dir_writable() {
  local dir="$1"
  [[ -n "$dir" && -d "$dir" ]] || return 1
  touch "${dir}/.handover_write_test" 2>/dev/null || return 1
  rm -f "${dir}/.handover_write_test"
}

handover_resolve_data_dir() {
  if [[ -n "${BUOY_DATA_DIR:-}" ]]; then
    printf '%s' "$BUOY_DATA_DIR"
    return
  fi
  if handover_dir_writable "$HANDOVER_PREFERRED_DATA_DIR"; then
    printf '%s' "$HANDOVER_PREFERRED_DATA_DIR"
    return
  fi
  if handover_dir_writable "$HANDOVER_ALT_DATA_DIR"; then
    printf '%s' "$HANDOVER_ALT_DATA_DIR"
    return
  fi
  if handover_dir_writable "$HANDOVER_ALT_MOUNT"; then
    printf '%s' "$HANDOVER_ALT_MOUNT"
    return
  fi
  printf '%s' "$HANDOVER_PREFERRED_DATA_DIR"
}

handover_data_dir_probe() {
  local dir="$1"
  if handover_dir_writable "$dir"; then
    echo "writable"
  elif [[ -d "$dir" ]]; then
    echo "present_not_writable"
  elif [[ -e "$dir" ]]; then
    echo "exists_not_dir"
  else
    echo "missing"
  fi
}

handover_report_data_dirs() {
  echo "data_dir_active: ${DATA_DIR}"
  echo "data_dir_preferred (${HANDOVER_PREFERRED_DATA_DIR}): $(handover_data_dir_probe "$HANDOVER_PREFERRED_DATA_DIR")"
  echo "data_dir_alt (${HANDOVER_ALT_DATA_DIR}): $(handover_data_dir_probe "$HANDOVER_ALT_DATA_DIR")"
  echo "data_dir_alt_mount (${HANDOVER_ALT_MOUNT}): $(handover_data_dir_probe "$HANDOVER_ALT_MOUNT")"
  if [[ -n "${BUOY_DATA_DIR:-}" ]]; then
    echo "buoy_data_dir_env: ${BUOY_DATA_DIR}"
  else
    echo "buoy_data_dir_env: (unset — auto-detect used)"
  fi
}

handover_warn_data_dir_mismatch() {
  if [[ "$DATA_DIR" == "$HANDOVER_PREFERRED_DATA_DIR" ]]; then
    return
  fi
  if [[ -n "${BUOY_DATA_DIR:-}" ]]; then
    handover_warn "BUOY_DATA_DIR=${BUOY_DATA_DIR} differs from preferred ${HANDOVER_PREFERRED_DATA_DIR}. OK if the Pi SSD is mounted elsewhere; ensure services use the same path."
    return
  fi
  handover_warn "Using ${DATA_DIR} because ${HANDOVER_PREFERRED_DATA_DIR} is unavailable. Set BUOY_DATA_DIR in /etc/buoy/buoy.env (e.g. ${HANDOVER_ALT_DATA_DIR} or ${HANDOVER_ALT_MOUNT})."
}

handover_load_env() {
  ENV_FILE="${ENV_FILE:-/etc/buoy/buoy.env}"
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$ENV_FILE"
    set +a
  fi
  export DATA_DIR="$(handover_resolve_data_dir)"
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
