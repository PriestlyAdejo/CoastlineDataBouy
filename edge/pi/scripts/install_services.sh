#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SYSTEMD_DIR="${REPO_ROOT}/edge/pi/systemd"

sudo mkdir -p /etc/buoy
ENV_EXAMPLE="${REPO_ROOT}/edge/pi/config/buoy.env.example"
[[ -f "$ENV_EXAMPLE" ]] || ENV_EXAMPLE="${REPO_ROOT}/edge/pi/.env.example"
if [[ -f "$ENV_EXAMPLE" && ! -f /etc/buoy/buoy.env ]]; then
  sudo cp "$ENV_EXAMPLE" /etc/buoy/buoy.env
  echo "Seeded /etc/buoy/buoy.env from $(basename "$ENV_EXAMPLE")"
fi

for unit in \
  buoy-seriald.service \
  buoy-ds18b20d.service \
  buoy-gnssd.service \
  buoy-audio-capture.service \
  buoy-wave-derive.service \
  buoy-wave-derive.timer \
  buoy-healthd.service \
  buoy-uploader.service
do
  sudo cp "${SYSTEMD_DIR}/${unit}" "/etc/systemd/system/${unit}"
done

sudo systemctl daemon-reload
sudo systemctl enable --now buoy-seriald buoy-ds18b20d buoy-gnssd buoy-audio-capture buoy-healthd buoy-uploader buoy-wave-derive.timer
echo "Installed and started buoy handover services."
