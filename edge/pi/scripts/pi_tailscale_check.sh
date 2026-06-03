#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/handover_common.sh
source "${SCRIPT_DIR}/lib/handover_common.sh"
handover_load_env

echo "========== PI TAILSCALE CHECK =========="
echo "tailscale status:"
if ! tailscale status 2>/dev/null; then
  echo ""
  echo "GUIDANCE: Tailscale not running or not logged in."
  echo "  - Run: sudo tailscale up"
  echo "  - Check internet with: edge/pi/scripts/pi_network_check.sh"
  exit 1
fi

PI_IP="$(tailscale ip -4 2>/dev/null || true)"
echo "tailscale ip -4: ${PI_IP:-unknown}"
if [[ -n "$PI_IP" && "$PI_IP" != "$EXPECTED_PI_TS_IP" ]]; then
  echo "NOTE: Pi IP ${PI_IP} differs from expected ${EXPECTED_PI_TS_IP} (update EXPECTED_PI_TS_IP if admin changed)"
fi

echo "ssh mode:"
tailscale status --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('ssh:', d.get('Self',{}).get('Online', 'unknown'))" 2>/dev/null || echo "unknown"

BACKEND_URL="http://${EXPECTED_LAPTOP_TS_IP}:8000/v1/healthz"
echo "backend probe: ${BACKEND_URL}"
if handover_curl_ok "$BACKEND_URL" 10; then
  echo "backend: REACHABLE"
  exit 0
fi

echo "backend: UNREACHABLE"
echo ""
if ! handover_ping_inet; then
  echo "GUIDANCE: No internet — fix 4G/Wi-Fi first (pi_network_check.sh, HDMI console)."
elif [[ -z "$PI_IP" ]]; then
  echo "GUIDANCE: Not logged into Tailscale — run: sudo tailscale up"
else
  echo "GUIDANCE: Tailscale up but backend unreachable. Check:"
  echo "  1) Laptop backend running: scripts/run_handover_backend_tailscale_windows.bat"
  echo "  2) Windows firewall allows inbound TCP 8000 on Private network"
  echo "  3) Backend bound to 0.0.0.0 (not 127.0.0.1 only)"
  echo "  4) BUOY_BACKEND_API_BASE in /etc/buoy/buoy.env matches laptop Tailscale IP ${EXPECTED_LAPTOP_TS_IP}"
  echo "  5) Tailscale ACL allows Pi -> laptop:8000"
fi
exit 1
