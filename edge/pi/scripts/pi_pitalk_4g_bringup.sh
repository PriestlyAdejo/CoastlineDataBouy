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
LSUSB_MODEM_SIG=false
TTYUSB_PORTS=""
TTYACM_PORTS=""
MMCLI_MODEMS="[]"
CONNECT_ATTEMPTED=false
CONNECT_SUCCESS=false

if ls /dev/ttyUSB* >/dev/null 2>&1; then
  TTYUSB_PORTS="$(ls -1 /dev/ttyUSB* 2>/dev/null | paste -sd, - || true)"
fi
if ls /dev/ttyACM* >/dev/null 2>&1; then
  TTYACM_PORTS="$(ls -1 /dev/ttyACM* 2>/dev/null | paste -sd, - || true)"
fi

if lsusb 2>/dev/null | egrep -qi "quectel|eg25|ec25"; then
  MODEM_DETECTED=true
  LSUSB_MODEM_SIG=true
  handover_pass "Quectel modem visible on USB"
elif [[ -n "$TTYUSB_PORTS" ]]; then
  MODEM_DETECTED=true
  handover_warn "ttyUSB present (modem likely) but Quectel not matched in lsusb"
else
  handover_warn "No modem USB signature or ttyUSB ports (Wi-Fi/Tailscale may still work)"
fi

CELL_STATE="unknown"
CELL_CONN=""

if command -v mmcli >/dev/null 2>&1; then
  echo ""
  echo "mmcli -L:"
  MM_LIST="$(mmcli -L 2>/dev/null || true)"
  echo "$MM_LIST"
  MMCLI_MODEMS="$(python3 -c "import re,sys; ids=re.findall(r'/Modem/(\\d+)', sys.stdin.read()); print(__import__('json').dumps(ids))" <<<"$MM_LIST" 2>/dev/null || echo '[]')"
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
      CONNECT_ATTEMPTED=true
      if mmcli -m "$MODEM_ID" --simple-connect="apn=${APN}" 2>/dev/null; then
        handover_pass "ModemManager simple-connect attempted"
        CONNECT_SUCCESS=true
      else
        handover_warn "ModemManager connect failed or already connected"
      fi
    fi
    CELL_STATE="$(mmcli -m "$MODEM_ID" 2>/dev/null | awk -F': ' '/state:/ {print $2; exit}' || echo unknown)"
  fi
fi

WIFI_RADIO="unknown"
WWAN_RADIO="unknown"
WIFI_CONNECTED=false
if command -v nmcli >/dev/null 2>&1; then
  WIFI_RADIO="$(nmcli -t -f WIFI radio 2>/dev/null || echo unknown)"
  WWAN_RADIO="$(nmcli -t -f WWAN radio 2>/dev/null || echo unknown)"
  if nmcli -t -f DEVICE,STATE device status 2>/dev/null | awk -F: '$2 ~ /connected/ && $1 ~ /^(wlan|wlp|wlx)/ {found=1} END{exit !found}'; then
    WIFI_CONNECTED=true
  fi
fi

if command -v nmcli >/dev/null 2>&1 && [[ -n "$APN" ]]; then
  echo ""
  echo "--- NetworkManager buoy-4g profile ---"
  CONNECT_ATTEMPTED=true
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
  if nmcli con up "$CONN_NAME" 2>/dev/null || sudo nmcli con up "$CONN_NAME" 2>/dev/null; then
    handover_pass "nmcli con up ${CONN_NAME}"
    CONNECT_SUCCESS=true
  else
    handover_warn "nmcli con up ${CONN_NAME} failed (may already be up or no SIM)"
  fi
  CELL_CONN="$CONN_NAME"
  CELL_STATE="$(nmcli -t -f GENERAL.STATE con show "$CONN_NAME" 2>/dev/null | cut -d: -f2 || echo unknown)"
  if [[ "$CELL_STATE" == *activated* ]] || [[ "$CELL_STATE" == *connected* ]]; then
    CONNECT_SUCCESS=true
  fi
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
TAILSCALE_ONLINE=false
[[ -n "$TS_IP" ]] && TAILSCALE_ONLINE=true

PROBE_WARNINGS="[]"
PROBE_FAILURES="[]"
if [[ "$MODEM_DETECTED" != true ]]; then
  PROBE_WARNINGS='["modem_not_detected","pitalk_module_not_enumerating"]'
fi
if [[ "$BACKEND_OK" != true ]]; then
  PROBE_FAILURES='["backend_unreachable"]'
fi

PYTHON="${PYTHON:-python3}"
REPO_ROOT="$(handover_repo_root)"
EDGE_SRC="${REPO_ROOT}/edge/pi/src"
if [[ ! -d "$EDGE_SRC" ]]; then
  EDGE_SRC="${SCRIPT_DIR}/../src"
fi
export PYTHONPATH="${EDGE_SRC}:${PYTHONPATH:-}"
export CONNECTIVITY_PROBE_DATA_DIR="${DATA_DIR}"
export CONNECTIVITY_PROBE_NODE_ID="${NODE_ID}"
export CONNECTIVITY_PROBE_WIFI_RADIO="${WIFI_RADIO}"
export CONNECTIVITY_PROBE_WWAN_RADIO="${WWAN_RADIO}"
export CONNECTIVITY_PROBE_WIFI_CONNECTED="$([[ "$WIFI_CONNECTED" == true ]] && echo true || echo false)"
export CONNECTIVITY_PROBE_DEFAULT_ROUTE_IFACE="${DEFAULT_IFACE}"
export CONNECTIVITY_PROBE_TAILSCALE_ONLINE="$([[ "$TAILSCALE_ONLINE" == true ]] && echo true || echo false)"
export CONNECTIVITY_PROBE_TAILSCALE_IP="${TS_IP}"
export CONNECTIVITY_PROBE_BACKEND_REACHABLE="$([[ "$BACKEND_OK" == true ]] && echo true || echo false)"
export CONNECTIVITY_PROBE_BACKEND_URL="${BACKEND_URL}"
export CONNECTIVITY_PROBE_MODEM_DETECTED="$([[ "$MODEM_DETECTED" == true ]] && echo true || echo false)"
export CONNECTIVITY_PROBE_MODEM_ID="${MODEM_ID}"
export CONNECTIVITY_PROBE_TTYUSB_PORTS="${TTYUSB_PORTS}"
export CONNECTIVITY_PROBE_TTYACM_PORTS="${TTYACM_PORTS}"
export CONNECTIVITY_PROBE_LSUSB_MODEM_SIGNATURE="$([[ "$LSUSB_MODEM_SIG" == true ]] && echo true || echo false)"
export CONNECTIVITY_PROBE_MMCLI_MODEMS="${MMCLI_MODEMS}"
export CONNECTIVITY_PROBE_APN_CONFIGURED="$([[ -n "$APN" ]] && echo true || echo false)"
export CONNECTIVITY_PROBE_CONNECT_ATTEMPTED="$([[ "$CONNECT_ATTEMPTED" == true ]] && echo true || echo false)"
export CONNECTIVITY_PROBE_CONNECT_SUCCESS="$([[ "$CONNECT_SUCCESS" == true ]] && echo true || echo false)"
export CONNECTIVITY_PROBE_CELLULAR_CONNECTION="${CELL_CONN}"
export CONNECTIVITY_PROBE_CELLULAR_STATE="${CELL_STATE}"
export CONNECTIVITY_PROBE_ACTIVE_INTERFACES="${ACTIVE_IFACES}"
export CONNECTIVITY_PROBE_WARNINGS="${PROBE_WARNINGS}"
export CONNECTIVITY_PROBE_FAILURES="${PROBE_FAILURES}"

if "$PYTHON" -m buoy.hardware.connectivity_probe; then
  handover_pass "Wrote connectivity report"
else
  handover_warn "Could not write connectivity report to ${REPORT_PATH}"
fi

echo ""
handover_print_summary

if [[ "$MODEM_DETECTED" != true ]]; then
  echo ""
  echo "========== PITALK / 4G NEXT ACTIONS =========="
  echo "PiTalk/Quectel module not detected on USB — 4G unavailable; Wi-Fi/Tailscale can remain active."
  echo "  1. Confirm PiTalk HAT/module power LED or status indicator"
  echo "  2. Press/hold PiTalk module power key for 3–4 seconds if required"
  echo "  3. Confirm USB cable/header path between Pi and HAT (if using USB mode)"
  echo "  4. Re-run: lsusb"
  echo "  5. Re-run: dmesg -T | egrep -i \"quectel|eg25|ec25|ttyUSB|wwan|qmi|mbim|modem\""
  echo "  6. Re-run this script: edge/pi/scripts/pi_pitalk_4g_bringup.sh"
  echo "  7. Do not set APN until a modem is detected (mmcli -L or ttyUSB appears)"
  echo "  8. Wi-Fi/Tailscale/backend handover path can stay up while troubleshooting 4G"
fi

if [[ "$REBOOT_IF_NEEDED" -eq 1 && "$HANDOVER_FAIL" -gt 0 ]]; then
  echo "Reboot requested (--reboot-if-needed) due to FAIL count."
  sudo reboot
fi
