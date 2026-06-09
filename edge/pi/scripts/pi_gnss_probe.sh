#!/usr/bin/env bash
# Probe PiTalk/Quectel GNSS via NMEA serial and AT commands (safe to re-run).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/handover_common.sh
source "${SCRIPT_DIR}/lib/handover_common.sh"

ENABLE_GNSS=0
NMEA_SECONDS=8

usage() {
  cat <<'EOF'
Usage: pi_gnss_probe.sh [--enable-gnss] [--nmea-seconds N]

Probes ttyUSB/ttyACM/serial0/by-id/by-path for NMEA and Quectel AT GNSS.
Does not permanently enable GNSS unless --enable-gnss is passed.

Report: $BUOY_DATA_DIR/telemetry/gnss_probe_report.json
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --enable-gnss) ENABLE_GNSS=1; shift ;;
    --nmea-seconds) NMEA_SECONDS="${2:?}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

handover_load_env
REPORT_PATH="${DATA_DIR}/telemetry/gnss_probe_report.json"
mkdir -p "${DATA_DIR}/telemetry"

echo "========== GNSS PROBE =========="
echo "data_dir: ${DATA_DIR}"
echo "enable_gnss: ${ENABLE_GNSS}"
echo ""

echo "--- Candidate ports ---"
ls -la /dev/ttyUSB* 2>/dev/null || echo "(no ttyUSB)"
ls -la /dev/ttyACM* 2>/dev/null || echo "(no ttyACM)"
ls -la /dev/serial0 2>/dev/null || echo "(no serial0)"
ls -la /dev/serial/by-id/ 2>/dev/null || true
ls -la /dev/serial/by-path/ 2>/dev/null || true
echo ""

PYTHON="${PYTHON:-python3}"
export GNSS_PROBE_ENABLE="${ENABLE_GNSS}"
export GNSS_PROBE_NMEA_SECONDS="${NMEA_SECONDS}"
export GNSS_PROBE_DATA_DIR="${DATA_DIR}"

REPO_ROOT="$(handover_repo_root)"
EDGE_SRC="${REPO_ROOT}/edge/pi/src"
if [[ ! -d "$EDGE_SRC" ]]; then
  EDGE_SRC="${SCRIPT_DIR}/../src"
fi
export PYTHONPATH="${EDGE_SRC}:${PYTHONPATH:-}"

"$PYTHON" - <<'PY'
import json
import os

from buoy.hardware.gnss_probe import run_gnss_probe, write_probe_report

data_dir = Path(os.environ["GNSS_PROBE_DATA_DIR"])
enable = os.environ.get("GNSS_PROBE_ENABLE", "0") == "1"
nmea_s = float(os.environ.get("GNSS_PROBE_NMEA_SECONDS", "8"))

report = run_gnss_probe(enable_gnss=enable, nmea_seconds=nmea_s)
out = write_probe_report(data_dir, report)
print(json.dumps(report, indent=2))
print(f"\nreport_written: {out}")
PY

echo ""
echo "========== GNSS PROBE SUMMARY =========="
OUTCOME="$(python3 -c "import json; print(json.load(open('${REPORT_PATH}')).get('outcome','unknown'))" 2>/dev/null || echo unknown)"
case "$OUTCOME" in
  nmea_port)
    handover_pass "NMEA GNSS detected — set BUOY_GNSS_PORT from report recommendation"
    ;;
  quectel_at_fix)
    handover_pass "Quectel AT GNSS fix obtained"
    ;;
  gnss_no_fix)
    handover_warn "GNSS engine present but no fix yet — keep IP fallback for handover"
    ;;
  gnss_no_device)
    handover_warn "No GNSS device detected — IP fallback remains acceptable if labelled"
    ;;
  *)
    handover_warn "GNSS probe outcome: ${OUTCOME}"
    ;;
esac

if [[ -f "$REPORT_PATH" ]]; then
  echo "report: ${REPORT_PATH}"
  if command -v jq >/dev/null 2>&1; then
    jq -r '.recommendation // {} | to_entries[] | "\(.key)=\(.value)"' "$REPORT_PATH" 2>/dev/null || true
  fi
fi

handover_print_summary
