#!/usr/bin/env bash
# 10s hydrophone smoke test — does not stop buoy-audio-capture unless --stop-service passed.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/handover_common.sh
source "${SCRIPT_DIR}/lib/handover_common.sh"
handover_load_env

STOP_SVC=0
for arg in "$@"; do
  if [[ "$arg" == "--stop-service" ]]; then STOP_SVC=1; fi
done

if [[ "$STOP_SVC" == "1" ]]; then
  sudo systemctl stop buoy-audio-capture || true
  trap 'sudo systemctl start buoy-audio-capture || true' EXIT
fi

OUT_DIR="${DATA_DIR}/tmp/smoke_audio"
mkdir -p "$OUT_DIR"
WAV="${OUT_DIR}/smoke_test_$(date +%Y%m%dT%H%M%S).wav"
META="${WAV%.wav}.json"

echo "Detecting audio device..."
"${SCRIPT_DIR}/detect_audio_device.sh" || true

DEVICE="${BUOY_AUDIO_DEVICE:-}"
if [[ -z "$DEVICE" ]]; then
  DEVICE=$(arecord -l 2>/dev/null | awk '/card/ {print; exit}' || true)
  echo "WARN: set BUOY_AUDIO_DEVICE in buoy.env if auto-detect fails"
  DEVICE="${BUOY_AUDIO_DEVICE:-hw:0,0}"
fi

RATE="${BUOY_AUDIO_SAMPLE_RATE:-96000}"
CH="${BUOY_AUDIO_CHANNELS:-2}"
FMT="${BUOY_AUDIO_FORMAT:-S32_LE}"

echo "Recording 10s to ${WAV} (device=${DEVICE})..."
arecord -D "$DEVICE" -f "$FMT" -r "$RATE" -c "$CH" -d 10 "$WAV"

SIZE=$(stat -c%s "$WAV" 2>/dev/null || stat -f%z "$WAV")
echo "WAV size_bytes: ${SIZE}"

python3 - <<PY
import json, hashlib, os
from datetime import datetime, timezone
wav = "${WAV}"
meta = {
  "node_id": "${NODE_ID}",
  "ts_start": datetime.now(timezone.utc).isoformat(),
  "ts_end": datetime.now(timezone.utc).isoformat(),
  "sample_rate_hz": int("${RATE}"),
  "channels": int("${CH}"),
  "format": "${FMT}",
  "file_path": wav,
  "size_bytes": int("${SIZE}"),
  "calibration_status": "uncalibrated",
  "selected_audio_device": "${DEVICE}",
  "sha256": hashlib.sha256(open(wav, "rb").read()).hexdigest(),
  "test": True,
}
open("${META}", "w").write(json.dumps(meta, indent=2))
print("metadata:", "${META}")
PY

echo "Smoke test complete."
