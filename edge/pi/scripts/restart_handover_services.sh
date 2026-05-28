#!/usr/bin/env bash
set -euo pipefail

for svc in buoy-seriald buoy-ds18b20d buoy-gnssd buoy-audio-capture buoy-healthd buoy-uploader buoy-wave-derive.timer; do
  sudo systemctl restart "$svc"
done

sudo systemctl --no-pager status buoy-seriald buoy-ds18b20d buoy-gnssd buoy-audio-capture buoy-healthd buoy-uploader
