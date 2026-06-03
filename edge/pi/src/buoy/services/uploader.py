from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from buoy.config import load_settings
from buoy.index.sqlite_index import get_pending_upload_artifacts, init_db, open_db, set_upload_status
from buoy.logging import setup_logging
from buoy.upload.http_client import post_json


KIND_TO_ENDPOINT = {
    "wave_stats_jsonl": "/ingest/wave_stats",
    "audio_wav": "/ingest/acoustic_meta",
    "serial_telemetry_jsonl": "/ingest/telemetry",
    "gnss_jsonl": "/ingest/telemetry",
    "env_jsonl": "/ingest/env",
    "health_jsonl": "/ingest/health",
}


def _load_cursor_state(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_cursor_state(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _post_artifact(settings, artifact: dict) -> tuple[bool, str]:
    kind = artifact["kind"]
    endpoint = KIND_TO_ENDPOINT.get(kind)
    if not endpoint:
        return False, f"no endpoint for kind={kind}"

    url = settings.backend_api_base.rstrip("/") + endpoint
    headers = {"X-Buoy-Token": settings.buoy_upload_token}

    if kind == "audio_wav":
        meta_json = artifact.get("meta_json")
        if not meta_json:
            return False, "missing meta_json"
        payload = json.loads(meta_json)
    elif kind == "wave_stats_jsonl":
        meta_json = artifact.get("meta_json")
        payload = json.loads(meta_json) if meta_json else {"node_id": settings.node_id}
    elif kind in {"serial_telemetry_jsonl", "gnss_jsonl", "env_jsonl", "health_jsonl"}:
        meta_json = artifact.get("meta_json")
        payload = json.loads(meta_json) if meta_json else {"node_id": settings.node_id}
    else:
        payload = {"node_id": settings.node_id}

    res = post_json(url, payload, headers=headers, timeout_s=10.0)
    if not res.ok:
        return False, f"status={res.status} body={res.body[:200]}"
    return True, res.body[:200]


def main() -> None:
    """Upload queued artifacts with persistent status and exponential backoff."""
    settings = load_settings()
    logger = setup_logging("buoy.uploader")

    index_db_path = settings.paths.data_dir / "index" / "buoy.sqlite"
    con = open_db(index_db_path)
    init_db(con)

    kinds = list(KIND_TO_ENDPOINT.keys())
    backoff_s = 2.0
    idle_s = max(2, settings.upload_interval_s)
    cursor_path = settings.paths.base_dir / "run" / "uploader_cursor.json"
    cursor_state = _load_cursor_state(cursor_path)
    consecutive_failures = 0
    spooling_logged = False

    while True:
        pending = get_pending_upload_artifacts(con, node_id=settings.node_id, kinds=kinds, limit=25)
        if not pending:
            if spooling_logged:
                logger.info("upload_mode=idle_local_queue_empty")
                spooling_logged = False
            time.sleep(idle_s)
            continue

        for a in pending:
            artifact_id = int(a["id"])
            set_upload_status(con, artifact_id=artifact_id, status="in_progress")
            ok, detail = _post_artifact(settings, a)
            if ok:
                set_upload_status(con, artifact_id=artifact_id, status="done", remote_ref=detail)
                cursor_state[a["kind"]] = artifact_id
                cursor_state["last_upload_ok_iso"] = datetime.now(timezone.utc).isoformat()
                cursor_state.pop("last_upload_error", None)
                _save_cursor_state(cursor_path, cursor_state)
                logger.info(
                    "upload_ok id=%s kind=%s endpoint=%s",
                    artifact_id,
                    a["kind"],
                    KIND_TO_ENDPOINT.get(a["kind"]),
                )
                backoff_s = 2.0
                consecutive_failures = 0
                spooling_logged = False
            else:
                set_upload_status(con, artifact_id=artifact_id, status="failed", last_error=detail)
                consecutive_failures += 1
                cursor_state["last_upload_error"] = detail
                cursor_state["last_upload_fail_iso"] = datetime.now(timezone.utc).isoformat()
                _save_cursor_state(cursor_path, cursor_state)
                logger.warning(
                    "upload_failed id=%s kind=%s endpoint=%s err=%s",
                    artifact_id,
                    a["kind"],
                    KIND_TO_ENDPOINT.get(a["kind"]),
                    detail,
                )
                if not spooling_logged or consecutive_failures == 1:
                    logger.info(
                        "upload_mode=spooling_local_only backend_unreachable=true "
                        "data_stored_on_ssd=true pending_count=%s",
                        len(pending),
                    )
                    spooling_logged = True
                time.sleep(min(backoff_s, 60.0))
                backoff_s = min(backoff_s * 2.0, 60.0)


if __name__ == "__main__":
    main()
