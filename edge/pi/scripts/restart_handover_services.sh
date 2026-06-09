#!/usr/bin/env bash
set -euo pipefail

SERVICES=(
  buoy-seriald
  buoy-ds18b20d
  buoy-gnssd
  buoy-audio-capture
  buoy-healthd
  buoy-uploader
)

sudo systemctl daemon-reload

for svc in "${SERVICES[@]}"; do
  sudo systemctl reset-failed "${svc}" 2>/dev/null || true
done

for svc in "${SERVICES[@]}" buoy-wave-derive.timer; do
  sudo systemctl restart "${svc}"
done

echo ""
echo "Service status (full lines, no pager):"
for svc in "${SERVICES[@]}"; do
  echo "===== ${svc} ====="
  sudo systemctl status "${svc}" --no-pager -l || true
  active_state="$(systemctl show -p ActiveState --value "${svc}" 2>/dev/null || echo unknown)"
  result="$(systemctl show -p Result --value "${svc}" 2>/dev/null || echo unknown)"
  exec_main_status="$(systemctl show -p ExecMainStatus --value "${svc}" 2>/dev/null || echo "")"
  if [[ "${active_state}" == "failed" || "${result}" == "exit-code" ]]; then
    case "${exec_main_status}" in
      203)
        echo "DIAGNOSIS: ${svc} failed with 203/EXEC — ExecStart binary missing or not executable."
        echo "  Check: grep ExecStart= /etc/systemd/system/${svc}.service"
        ;;
      217)
        echo "DIAGNOSIS: ${svc} failed with 217/USER — configured User= does not exist or cannot be resolved."
        echo "  Check: grep User= /etc/systemd/system/${svc}.service"
        ;;
    esac
  fi
  echo ""
done
