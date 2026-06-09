#!/usr/bin/env bash
# PiTalk / Quectel 4G bring-up diagnostics (safe to re-run; does not destroy Wi-Fi).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/handover_common.sh
source "${SCRIPT_DIR}/lib/handover_common.sh"

PREFER_4G=0
REBOOT_IF_NEEDED=0
CONN_NAME="buoy-4g"

usage() {
  cat <<'EOF'
Usage: pi_pitalk_4g_bringup.sh [--prefer-4g] [--reboot-if-needed]

Reads BUOY_4G_APN / BUOY_4G_USER / BUOY_4G_PASSWORD from /etc/buoy/buoy.env.
Safe Wi-Fi nudge: rfkill unblock + nmcli radio wifi on (does not disable Wi-Fi).
Report: $BUOY_DATA_DIR/telemetry/connectivity_report.json
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefer-4g) PREFER_4G=1; shift ;;
    --reboot-if-needed) REBOOT_IF_NEEDED=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

handover_load_env
REPORT_PATH="${DATA_DIR}/telemetry/connectivity_report.json"
mkdir -p "${DATA_DIR}/telemetry"

APN="${BUOY_4G_APN:-}"
USER_4G="${BUOY_4G_USER:-}"
PASS_4G="${BUOY_4G_PASSWORD:-}"

echo "========== PITALK / 4G BRING-UP =========="
echo "data_dir: ${DATA_DIR}"
echo "prefer_4g: ${PREFER_4G}"
if [[ -z "$APN" ]]; then
  handover_warn "BUOY_4G_APN not set in /etc/buoy/buoy.env — diagnostics only, no connect attempt"
else
  echo "apn: ${APN}"
fi
echo ""

echo "--- Wi-Fi radio nudge (PiTalk may need Wi-Fi on first) ---"
if command -v rfkill >/dev/null 2>&1; then
  sudo rfkill unblock wifi 2>/dev/null || rfkill unblock wifi 2>/dev/null || true
  handover_pass "rfkill unblock wifi"
fi
if command -v nmcli >/dev/null 2>&1; then
  nmcli radio wifi on 2>/dev/null || sudo nmcli radio wifi on 2>/dev/null || true
  echo "nmcli radio all:"
  nmcli radio all 2>/dev/null || true
  echo ""
  echo "nmcli device status:"
  nmcli device status 2>/dev/null || true
else
  handover_warn "NetworkManager (nmcli) not available"
fi
echo ""

echo "--- Modem / USB detection ---"
echo "lsusb:"
lsusb 2>/dev/null || true
echo ""
echo "dmesg (quectel/modem):"
dmesg -T 2>/dev/null | egrep -i "quectel|eg25|ec25|sim|wwan|ttyUSB|cdc|qmi|mbim|modem|usb" | tail -n 40 || true
echo ""
echo "serial devices:"
ls -la /dev/ttyUSB* 2>/dev/null || echo "(no ttyUSB)"
ls -la /dev/ttyACM* 2>/dev/null || true
ls -la /dev/serial/by-id/ 2>/dev/null || true
ls -la /dev/serial/by-path/ 2>/dev/null || true

MODEM_DETECTED=false
MODEM_ID=""
if lsusb 2>/dev/null | egrep -qi "quectel|eg25|ec25"; then
  MODEM_DETECTED=true
  handover_pass "Quectel modem visible on USB"
elif ls -la /dev/ttyUSB* >/dev/null 2>&1; then
  MODEM_DETECTED=true
  handover_warn "ttyUSB present (modem likely) but Quectel not matched in lsusb"
else
  handover_fail "No modem USB signature or ttyUSB ports"
fi

CELL_STATE="unknown"
CELL_CONN=""

if command -v mmcli >/dev/null 2>&1; then
  echo ""
  echo "mmcli -L:"
  MM_LIST="$(mmcli -L 2>/dev/null || true)"
  echo "$MM_LIST"
  MODEM_ID="$(echo "$MM_LIST" | sed -n 's|.*/Modem/\([0-9]*\).*|\1|p' | head -n1)"
  if [[ -n "$MODEM_ID" ]]; then
    MODEM_DETECTED=true
    echo ""
    echo "mmcli -m ${MODEM_ID}:"
    mmcli -m "$MODEM_ID" 2>/dev/null || true
    echo ""
    echo "SIM:"
    mmcli -m "$MODEM_ID" --sim 2>/dev/null || true
    echo ""
    echo "Signal:"
    mmcli -m "$MODEM_ID" --signal-get 2>/dev/null || true
    if [[ -n "$APN" ]]; then
      mmcli -m "$MODEM_ID" --simple-connect="apn=${APN}" 2>/dev/null && handover_pass "ModemManager simple-connect attempted" || handover_warn "ModemManager connect failed or already connected"
    fi
    CELL_STATE="$(mmcli -m "$MODEM_ID" 2>/dev/null | awk -F': ' '/state:/ {print $2; exit}' || echo unknown)"
  fi
fi

if command -v nmcli >/dev/null 2>&1 && [[ -n "$APN" ]]; then
  echo ""
  echo "--- NetworkManager buoy-4g profile ---"
  if nmcli -t -f NAME con show 2>/dev/null | grep -qx "$CONN_NAME"; then
    nmcli con mod "$CONN_NAME" gsm.apn "$APN" 2>/dev/null || sudo nmcli con mod "$CONN_NAME" gsm.apn "$APN" 2>/dev/null || true
    [[ -n "$USER_4G" ]] && nmcli con mod "$CONN_NAME" gsm.username "$USER_4G" 2>/dev/null || true
    [[ -n "$PASS_4G" ]] && nmcli con mod "$CONN_NAME" gsm.password "$PASS_4G" 2>/dev/null || true
    handover_pass "Updated existing ${CONN_NAME} profile"
  else
    nmcli con add type gsm ifname "*" con-name "$CONN_NAME" apn "$APN" \
      ${USER_4G:+username "$USER_4G"} ${PASS_4G:+password "$PASS_4G"} \
      ipv4.route-metric 700 ipv6.route-metric 700 2>/dev/null \
      || sudo nmcli con add type gsm ifname "*" con-name "$CONN_NAME" apn "$APN" \
        ${USER_4G:+username "$USER_4G"} ${PASS_4G:+password "$PASS_4G"} \
        ipv4.route-metric 700 ipv6.route-metric 700 2>/dev/null \
      && handover_pass "Created ${CONN_NAME} profile" \
      || handover_warn "Could not create ${CONN_NAME} profile"
  fi
  if [[ "$PREFER_4G" -eq 1 ]]; then
    nmcli con mod "$CONN_NAME" ipv4.route-metric 50 ipv6.route-metric 50 2>/dev/null || true
    handover_warn "4G preferred (--prefer-4g): route metric lowered for test"
  fi
  nmcli con up "$CONN_NAME" 2>/dev/null || sudo nmcli con up "$CONN_NAME" 2>/dev/null \
    && handover_pass "nmcli con up ${CONN_NAME}" \
    || handover_warn "nmcli con up ${CONN_NAME} failed (may already be up or no SIM)"
  CELL_CONN="$CONN_NAME"
  CELL_STATE="$(nmcli -t -f GENERAL.STATE con show "$CONN_NAME" 2>/dev/null | cut -d: -f2 || echo unknown)"
fi

echo ""
echo "--- Connectivity verify ---"
echo "ip addr:"
ip addr 2>/dev/null || true
echo ""
echo "ip route:"
ip route 2>/dev/null || true
DEFAULT_IFACE="$(ip route show default 2>/dev/null | awk '{print $5; exit}' || echo "")"
echo "default_route_iface: ${DEFAULT_IFACE:-none}"
echo ""
echo "ping 8.8.8.8:"
ping -c 4 8.8.8.8 2>/dev/null || handover_warn "ping 8.8.8.8 failed"
echo ""
echo "curl tailscale.com:"
curl -I --max-time 10 https://tailscale.com 2>/dev/null | head -n 5 || handover_warn "HTTPS curl failed"
echo ""
echo "tailscale status:"
TS_IP="$(tailscale ip -4 2>/dev/null || echo "")"
tailscale status 2>/dev/null || handover_warn "tailscale unavailable"
echo ""
BACKEND_URL="${API_BASE%/}/healthz"
echo "backend healthz (${BACKEND_URL}):"
BACKEND_OK=false
if handover_curl_ok "$BACKEND_URL" 10; then
  BACKEND_OK=true
  handover_pass "Backend reachable at ${BACKEND_URL}"
else
  handover_warn "Backend not reachable at ${BACKEND_URL}"
fi

ACTIVE_IFACES="$(ip -o link show 2>/dev/null | awk -F': ' '{gsub(/^ +/,"",$2); print $2}' | paste -sd, - || echo "")"
TS_STATUS="$(tailscale status --json 2>/dev/null | head -c 2000 || echo "")"

python3 - <<PY
import json
from datetime import datetime, timezone

report = {
    "schema_version": "v1",
    "ts": datetime.now(timezone.utc).isoformat(),
    "apn_configured": bool("${APN}"),
    "modem_detected": ${MODEM_DETECTED,,},
    "modem_id": "${MODEM_ID}",
    "cellular_connection": "${CELL_CONN}",
    "cellular_state": "${CELL_STATE}",
    "default_route_iface": "${DEFAULT_IFACE}",
    "active_interfaces": "${ACTIVE_IFACES}".split(",") if "${ACTIVE_IFACES}" else [],
    "tailscale_ip": "${TS_IP}" or None,
    "backend_reachable": ${BACKEND_OK,,},
    "backend_url": "${BACKEND_URL}",
    "prefer_4g": ${PREFER_4G} == 1,
    "handover_summary": {"pass": ${HANDOVER_PASS}, "warn": ${HANDOVER_WARN}, "fail": ${HANDOVER_FAIL}},
}
with open("${REPORT_PATH}", "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2)
    f.write("\n")
print(f"report_written: ${REPORT_PATH}")
PY

echo ""
handover_print_summary

if [[ "$REBOOT_IF_NEEDED" -eq 1 && "$HANDOVER_FAIL" -gt 0 ]]; then
  echo "Reboot requested (--reboot-if-needed) due to FAIL count."
  sudo reboot
fi
