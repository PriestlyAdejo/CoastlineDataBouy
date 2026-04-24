#!/usr/bin/env bash
set -euo pipefail

REPO="/home/jason/CoastlineDataBouy"
BRANCH="${BUOY_DEPLOY_BRANCH:-pi-staging}"

cd "$REPO"
git fetch origin "$BRANCH"

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[auto_update] Updating to origin/$BRANCH"
    git checkout "$BRANCH"
    git pull --ff-only origin "$BRANCH"
    "$REPO/.venv/bin/pip" install -e "$REPO/edge/pi"

    # Safe default: keep recorder restarts manual to avoid capture disruption.
    systemctl try-restart buoy-uploader.service || true
fi
