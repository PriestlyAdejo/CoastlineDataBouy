#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SRC="${REPO}/edge/pi/config/buoy.env.handover.example"
if [[ ! -f "$SRC" ]]; then
  SRC="${SCRIPT_DIR}/../config/buoy.env.handover.example"
fi
DEST="/etc/buoy/buoy.env"

echo "Handover env installer"
echo "Source example: ${SRC}"
echo "Target: ${DEST}"

sudo mkdir -p /etc/buoy

if [[ -f "$DEST" && "${BUOY_FORCE_APPLY:-0}" != "1" ]]; then
  echo "Existing ${DEST} found — not overwriting."
  echo "To backup and apply handover profile: BUOY_FORCE_APPLY=1 $0"
  # shellcheck disable=SC1090
  source "$DEST"
  echo "Active BUOY_BACKEND_API_BASE=${BUOY_BACKEND_API_BASE:-unset}"
  echo "Edit laptop Tailscale IP in ${DEST} if your laptop IP changed."
  exit 0
fi

if [[ -f "$DEST" ]]; then
  BAK="/etc/buoy/buoy.env.bak.$(date +%Y%m%dT%H%M%S)"
  sudo cp "$DEST" "$BAK"
  echo "Backed up to ${BAK}"
fi

sudo cp "$SRC" "$DEST"
sudo chmod 640 "$DEST"
echo "Installed handover env to ${DEST}"
# shellcheck disable=SC1090
source "$DEST"
echo "Active BUOY_BACKEND_API_BASE=${BUOY_BACKEND_API_BASE}"
echo "Reminder: update laptop Tailscale IP if not ${BUOY_BACKEND_API_BASE}"
