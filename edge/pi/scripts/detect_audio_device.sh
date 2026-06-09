#!/usr/bin/env bash
set -euo pipefail

echo "=== arecord -l ==="
arecord -l || true
echo
echo "=== arecord -L ==="
arecord -L || true
echo
echo "=== selected device ==="
echo "${BUOY_AUDIO_DEVICE:-auto-detect}"
