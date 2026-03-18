#!/usr/bin/env bash
set -euo pipefail

export PYTHONPATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/src"
exec python -m uvicorn nereus_api.main:app --reload --host 127.0.0.1 --port 8000

