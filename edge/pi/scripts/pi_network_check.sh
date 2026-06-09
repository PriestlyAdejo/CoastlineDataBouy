#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/handover_common.sh
source "${SCRIPT_DIR}/lib/handover_common.sh"
handover_load_env

echo "========== PI NETWORK CHECK =========="
echo "ip addr:"
ip addr 2>/dev/null || true
echo ""
echo "ip route:"
ip route 2>/dev/null || true
echo ""
echo "resolv.conf:"
cat /etc/resolv.conf 2>/dev/null || true
echo ""
echo "ping 8.8.8.8:"
ping -c 4 8.8.8.8 2>/dev/null || echo "ping failed"
echo ""
echo "curl tailscale.com:"
curl -I --max-time 10 https://tailscale.com 2>/dev/null | head -n 5 || echo "curl failed"
echo ""
if command -v nmcli >/dev/null 2>&1; then
  echo "nmcli device status:"
  nmcli device status 2>/dev/null || true
fi
if command -v mmcli >/dev/null 2>&1; then
  echo "mmcli -L:"
  mmcli -L 2>/dev/null || true
fi
echo "lsusb:"
lsusb 2>/dev/null || true
echo ""
echo "network interfaces:"
ip -o link show 2>/dev/null | awk '{print $2}' || true
echo ""
echo "tailscale status:"
tailscale status 2>/dev/null || echo "tailscale unavailable"
