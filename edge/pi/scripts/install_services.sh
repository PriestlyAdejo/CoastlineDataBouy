#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SYSTEMD_DIR="${REPO_ROOT}/edge/pi/systemd"

if [[ -n "${BUOY_REPO_ROOT:-}" && -d "${BUOY_REPO_ROOT}/.git" ]]; then
  REPO_ROOT="$(cd "${BUOY_REPO_ROOT}" && pwd)"
fi

resolve_service_user() {
  if [[ -n "${BUOY_SERVICE_USER:-}" ]]; then
    echo "${BUOY_SERVICE_USER}"
    return
  fi
  if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    echo "${SUDO_USER}"
    return
  fi
  if [[ -n "${USER:-}" && "${USER}" != "root" ]]; then
    echo "${USER}"
    return
  fi
  echo "$(logname 2>/dev/null || whoami)"
}

resolve_python() {
  if [[ -n "${BUOY_PYTHON:-}" && -x "${BUOY_PYTHON}" ]]; then
    echo "${BUOY_PYTHON}"
    return
  fi
  if [[ -x "${REPO_ROOT}/.venv/bin/python" ]]; then
    echo "${REPO_ROOT}/.venv/bin/python"
    return
  fi
  command -v python3
}

resolve_data_dir() {
  if [[ -f /etc/buoy/buoy.env ]]; then
    local from_env
    from_env="$(grep -E '^BUOY_DATA_DIR=' /etc/buoy/buoy.env | tail -1 | cut -d= -f2- || true)"
    if [[ -n "${from_env}" ]]; then
      echo "${from_env}"
      return
    fi
  fi
  echo "/mnt/ssd/buoy"
}

SERVICE_USER="$(resolve_service_user)"
PYTHON_BIN="$(resolve_python)"
DATA_DIR="$(resolve_data_dir)"

sudo mkdir -p /etc/buoy
ENV_EXAMPLE="${REPO_ROOT}/edge/pi/config/buoy.env.handover.example"
[[ -f "$ENV_EXAMPLE" ]] || ENV_EXAMPLE="${REPO_ROOT}/edge/pi/config/buoy.env.example"
[[ -f "$ENV_EXAMPLE" ]] || ENV_EXAMPLE="${REPO_ROOT}/edge/pi/.env.example"
if [[ -f "$ENV_EXAMPLE" && ! -f /etc/buoy/buoy.env ]]; then
  sudo cp "$ENV_EXAMPLE" /etc/buoy/buoy.env
  echo "Seeded /etc/buoy/buoy.env from $(basename "$ENV_EXAMPLE")"
fi

sudo mkdir -p "${DATA_DIR}"
if ! sudo chown -R "${SERVICE_USER}:${SERVICE_USER}" "${DATA_DIR}" 2>/dev/null; then
  echo "WARN: could not chown ${DATA_DIR} to ${SERVICE_USER}; ensure it is writable"
fi

for grp in dialout audio; do
  if getent group "${grp}" >/dev/null 2>&1; then
    sudo usermod -aG "${grp}" "${SERVICE_USER}" 2>/dev/null || \
      echo "WARN: could not add ${SERVICE_USER} to group ${grp}"
  fi
done

render_service() {
  local src="$1"
  local dst="$2"
  sed \
    -e "s|@REPO_ROOT@|${REPO_ROOT}|g" \
    -e "s|@PYTHON@|${PYTHON_BIN}|g" \
    -e "s|@SERVICE_USER@|${SERVICE_USER}|g" \
    -e "s|@DATA_DIR@|${DATA_DIR}|g" \
    "${src}" | sudo tee "${dst}" >/dev/null
}

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
  render_service "${SYSTEMD_DIR}/${unit}" "/etc/systemd/system/${unit}"
  # Remove stale manual drop-ins that override /etc/buoy/buoy.env (e.g. nereus-edge.env).
  sudo rm -rf "/etc/systemd/system/${unit}.d"
done

sudo systemctl daemon-reload
sudo systemctl enable --now buoy-seriald buoy-ds18b20d buoy-gnssd buoy-audio-capture buoy-healthd buoy-uploader buoy-wave-derive.timer

echo ""
echo "Installed buoy handover services:"
for unit in buoy-seriald buoy-ds18b20d buoy-gnssd buoy-audio-capture buoy-wave-derive buoy-healthd buoy-uploader; do
  installed="/etc/systemd/system/${unit}.service"
  echo "--- ${unit}.service ---"
  echo "  User=$(grep -E '^User=' "${installed}" | cut -d= -f2-)"
  echo "  WorkingDirectory=$(grep -E '^WorkingDirectory=' "${installed}" | cut -d= -f2-)"
  echo "  ExecStart=$(grep -E '^ExecStart=' "${installed}" | cut -d= -f2-)"
  echo "  EnvironmentFile=$(grep -E '^EnvironmentFile=' "${installed}" | cut -d= -f2-)"
done

echo ""
echo "Repo root: ${REPO_ROOT}"
echo "Python:    ${PYTHON_BIN}"
echo "User:      ${SERVICE_USER}"
echo "Data dir:  ${DATA_DIR}"
