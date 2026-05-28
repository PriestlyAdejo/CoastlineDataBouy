from __future__ import annotations

import json
import time
from datetime import datetime, timezone

import serial

from buoy.config import load_settings
from buoy.hardware.gnss_detect import detect_gnss_port
from buoy.index.sqlite_index import add_artifact, init_db, open_db
from buoy.logging import setup_logging
from buoy.parsing.nmea import parse_nmea_sentence


def _ip_fallback() -> dict | None:
    # Lightweight fallback marker; caller labels it approximate.
    return None


def main() -> None:
    """Read GNSS sentences and persist/upload-ready telemetry JSONL."""
    settings = load_settings()
    logger = setup_logging("buoy.gnssd")
    port = (
        detect_gnss_port(settings.gnss.port, settings.gnss.baud, settings.gnss.read_timeout_s)
        if settings.gnss.auto_detect
        else settings.gnss.port
    )
    telemetry_path = settings.paths.data_dir / "telemetry" / "gnss.jsonl"
    telemetry_path.parent.mkdir(parents=True, exist_ok=True)
    con = open_db(settings.paths.data_dir / "index" / "buoy.sqlite")
    init_db(con)

    logger.info("gnss_port_selected=%s baud=%s", port, settings.gnss.baud)
    with serial.Serial(port=port, baudrate=settings.gnss.baud, timeout=settings.gnss.read_timeout_s) as ser:
        while True:
            raw = ser.readline()
            payload = None
            if raw:
                line = raw.decode("utf-8", errors="replace").strip()
                parsed = parse_nmea_sentence(line)
                payload = parsed.payload
                if parsed.reason and parsed.reason != "unsupported_sentence":
                    logger.debug("gnss_parse_reason=%s line=%s", parsed.reason, line[:120])
            if payload is None and settings.gnss.enable_ip_fallback:
                fallback = _ip_fallback()
                if fallback:
                    payload = {
                        "schema_version": "v1",
                        "node_id": settings.node_id,
                        "ts": datetime.now(timezone.utc).isoformat(),
                        "source": "gnss",
                        "gps": {
                            "lat": fallback["lat"],
                            "lon": fallback["lon"],
                            "source": "ip_fallback",
                            "quality": "approximate",
                        },
                    }
            if payload is not None:
                payload["node_id"] = settings.node_id
                line_out = json.dumps(payload, separators=(",", ":"))
                with telemetry_path.open("a", encoding="utf-8") as f:
                    f.write(line_out + "\n")
                add_artifact(
                    con,
                    node_id=settings.node_id,
                    kind="gnss_jsonl",
                    path=str(telemetry_path),
                    ts_start=payload.get("ts"),
                    ts_end=payload.get("ts"),
                    meta_json=line_out,
                )
                logger.info("gnss_fix lat=%s lon=%s", payload.get("gps", {}).get("lat"), payload.get("gps", {}).get("lon"))
            time.sleep(max(1, settings.gnss.interval_s))


if __name__ == "__main__":
    main()
