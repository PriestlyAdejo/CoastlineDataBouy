from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any

try:
    import serial
except ModuleNotFoundError:
    serial = None  # type: ignore[assignment,misc]

from buoy.config import load_settings
from buoy.index.sqlite_index import add_artifact, init_db, open_db
from buoy.logging import setup_logging
from buoy.parsing.nmea import parse_nmea_sentence
from buoy.parsing.quectel_gnss import parse_qgpsloc


def _ip_fallback() -> dict | None:
    """Lightweight approximate location from public IP geolocation (handover fallback)."""
    try:
        req = urllib.request.Request(
            "https://ipapi.co/json/",
            headers={"User-Agent": "buoy-gnssd/1.0"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        lat = data.get("latitude")
        lon = data.get("longitude")
        if lat is None or lon is None:
            return None
        return {"lat": float(lat), "lon": float(lon)}
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError, OSError):
        return None


def _no_fix_payload(
    settings,
    *,
    reason: str,
    ts: str | None = None,
    source: str = "gnss",
) -> dict:
    quality = "no_device" if reason in {"no_device", "gnss_no_device"} else "no_fix"
    src = "no_device" if quality == "no_device" else source
    return {
        "schema_version": "v1",
        "node_id": settings.node_id,
        "ts": ts or datetime.now(timezone.utc).isoformat(),
        "source": src,
        "gps": {
            "quality": quality,
            "fix_status": quality,
            "reason": reason,
            "source": src,
        },
    }


def _fix_payload(settings, gps: dict, ts: str | None = None) -> dict:
    fix_q = gps.get("fix_quality")
    fix_status = "3d" if fix_q and int(fix_q) > 0 else str(gps.get("status") or gps.get("fix_status") or "fix")
    src = str(gps.get("source") or "gnss")
    return {
        "schema_version": "v1",
        "node_id": settings.node_id,
        "ts": ts or datetime.now(timezone.utc).isoformat(),
        "source": src,
        "gps": {
            **gps,
            "quality": "fix",
            "fix_status": fix_status,
            "source": src,
        },
    }


def _approximate_payload(settings, lat: float, lon: float) -> dict:
    return {
        "schema_version": "v1",
        "node_id": settings.node_id,
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": "gnss",
        "gps": {
            "lat": lat,
            "lon": lon,
            "source": "ip_fallback",
            "quality": "approximate",
            "fix_status": "approximate",
            "reason": "ip_geolocation_fallback",
        },
    }


def _persist(
    settings,
    con,
    telemetry_path,
    payload: dict,
    logger,
) -> None:
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
    gps = payload.get("gps") or {}
    logger.info(
        "gnss_sample quality=%s lat=%s lon=%s reason=%s",
        gps.get("quality"),
        gps.get("lat"),
        gps.get("lon"),
        gps.get("reason"),
    )


def _at_exchange(ser: Any, cmd: str, wait_s: float = 2.0) -> str:
    ser.reset_input_buffer()
    ser.write((cmd + "\r\n").encode("ascii"))
    ser.flush()
    deadline = time.time() + wait_s
    chunks: list[str] = []
    while time.time() < deadline:
        raw = ser.readline()
        if not raw:
            continue
        chunks.append(raw.decode("utf-8", errors="replace"))
        joined = "".join(chunks)
        if "OK" in joined or "ERROR" in joined:
            if cmd.upper().startswith("AT+QGPSLOC") or cmd.upper().startswith("AT+QGPSGNMEA"):
                time.sleep(0.3)
                while ser.in_waiting:
                    chunks.append(ser.read(ser.in_waiting).decode("utf-8", errors="replace"))
            break
    return "".join(chunks)


def _quectel_poll(ser: Any) -> tuple[dict | None, str | None]:
    """Poll Quectel GNSS via AT commands; return (payload, reason)."""
    resp = _at_exchange(ser, "AT+QGPSLOC?")
    loc = parse_qgpsloc(resp)
    if loc and loc.get("quality") == "fix":
        return loc, None
    if loc and loc.get("quality") == "no_fix":
        return None, "gnss_no_fix"
    if "OK" in resp.upper():
        return None, "gnss_no_fix"
    return None, "at_error"


def _run_quectel_at_loop(settings, con, telemetry_path, logger, port: str) -> None:
    last_heartbeat = 0.0
    last_state = "unknown"
    heartbeat_s = max(1, settings.gnss.location_heartbeat_interval_s)
    read_interval_s = max(1, settings.gnss.interval_s)
    gnss_enabled = False

    while True:
        ser: Any = None
        try:
            ser = serial.Serial(  # type: ignore[union-attr]
                port=port,
                baudrate=settings.gnss.at_baud,
                timeout=settings.gnss.read_timeout_s,
            )
            if not gnss_enabled:
                _at_exchange(ser, "AT+QGPS=1", wait_s=3.0)
                gnss_enabled = True
                logger.info("quectel_gnss_enabled port=%s", port)
        except Exception as exc:
            logger.error("quectel_open_failed port=%s err=%s", port, exc)
            now = time.time()
            if now - last_heartbeat >= heartbeat_s:
                _persist(
                    settings,
                    con,
                    telemetry_path,
                    _no_fix_payload(settings, reason="no_device", source="no_device"),
                    logger,
                )
                last_heartbeat = now
            time.sleep(read_interval_s)
            continue

        gps, reason = _quectel_poll(ser)
        payload = None
        if gps:
            payload = _fix_payload(settings, {**gps, "source": "quectel_at"})
            last_state = "fix"
        elif reason:
            payload = _no_fix_payload(settings, reason=reason, source="quectel_at")
            last_state = "no_fix"

        if payload is None and settings.gnss.enable_ip_fallback and last_state != "fix":
            fb = _ip_fallback()
            if fb:
                payload = _approximate_payload(settings, fb["lat"], fb["lon"])
                last_state = "approximate"

        now = time.time()
        if now - last_heartbeat >= heartbeat_s:
            if payload is None:
                payload = _no_fix_payload(
                    settings,
                    reason=reason or "gnss_no_fix",
                    source="quectel_at",
                )
            _persist(settings, con, telemetry_path, payload, logger)
            last_heartbeat = now
        elif payload is not None:
            _persist(settings, con, telemetry_path, payload, logger)

        try:
            ser.close()
        except Exception:
            pass
        time.sleep(read_interval_s)


def main() -> None:
    """Read GNSS sentences and persist/upload-ready telemetry JSONL."""
    settings = load_settings()
    logger = setup_logging("buoy.gnssd")
    telemetry_path = settings.paths.data_dir / "telemetry" / "gnss.jsonl"
    telemetry_path.parent.mkdir(parents=True, exist_ok=True)
    con = open_db(settings.paths.data_dir / "index" / "buoy.sqlite")
    init_db(con)

    mode = (settings.gnss.mode or "auto").strip().lower()
    if mode == "quectel_at" or (mode == "auto" and settings.gnss.at_port):
        at_port = settings.gnss.at_port or settings.gnss.port
        if serial is None:
            logger.error("gnss_pyserial_missing install pyserial on the Pi")
        else:
            logger.info("gnss_mode=quectel_at port=%s", at_port)
            _run_quectel_at_loop(settings, con, telemetry_path, logger, at_port)
            return

    last_heartbeat = 0.0
    last_state: str = "unknown"
    heartbeat_s = max(1, settings.gnss.location_heartbeat_interval_s)
    read_interval_s = max(1, settings.gnss.interval_s)

    if serial is None:
        logger.error("gnss_pyserial_missing install pyserial on the Pi")
        while True:
            now = time.time()
            if now - last_heartbeat >= heartbeat_s:
                payload = _no_fix_payload(settings, reason="no_pyserial")
                _persist(settings, con, telemetry_path, payload, logger)
                last_heartbeat = now
            time.sleep(read_interval_s)
        return

    if mode == "nmea":
        port = settings.gnss.port
    else:
        from buoy.hardware.gnss_detect import detect_gnss_port

        port = None
        if settings.gnss.auto_detect:
            try:
                port = detect_gnss_port(
                    settings.gnss.port, settings.gnss.baud, settings.gnss.read_timeout_s
                )
            except RuntimeError:
                port = None
        else:
            port = settings.gnss.port

    if not port:
        logger.warning("gnss_no_device port_not_found")
        while True:
            now = time.time()
            if now - last_heartbeat >= heartbeat_s:
                payload = _no_fix_payload(settings, reason="no_device", source="no_device")
                _persist(settings, con, telemetry_path, payload, logger)
                last_heartbeat = now
                if settings.gnss.enable_ip_fallback:
                    fb = _ip_fallback()
                    if fb:
                        _persist(
                            settings,
                            con,
                            telemetry_path,
                            _approximate_payload(settings, fb["lat"], fb["lon"]),
                            logger,
                        )
            time.sleep(read_interval_s)
        return

    logger.info("gnss_port_selected=%s baud=%s mode=%s", port, settings.gnss.baud, mode or "nmea")
    ser: Any = None
    try:
        ser = serial.Serial(
            port=port, baudrate=settings.gnss.baud, timeout=settings.gnss.read_timeout_s
        )
    except serial.SerialException as exc:  # type: ignore[union-attr]
        logger.error("gnss_open_failed port=%s err=%s", port, exc)
        while True:
            now = time.time()
            if now - last_heartbeat >= heartbeat_s:
                _persist(
                    settings,
                    con,
                    telemetry_path,
                    _no_fix_payload(settings, reason="no_device", source="no_device"),
                    logger,
                )
                last_heartbeat = now
            time.sleep(read_interval_s)
        return

    consecutive_no_fix = 0
    while True:
        raw = ser.readline() if ser else b""
        payload = None
        reason: str | None = None

        if raw:
            line = raw.decode("utf-8", errors="replace").strip()
            parsed = parse_nmea_sentence(line)
            if parsed.payload and parsed.payload.get("gps"):
                gps = parsed.payload["gps"]
                if gps.get("lat") is not None and gps.get("lon") is not None:
                    payload = _fix_payload(settings, gps, parsed.payload.get("ts"))
                    last_state = "fix"
                    consecutive_no_fix = 0
                else:
                    reason = parsed.reason or "no_fix"
            elif parsed.reason:
                reason = parsed.reason
                if reason == "invalid_coords":
                    reason = "no_fix"
        else:
            consecutive_no_fix += 1
            if consecutive_no_fix >= 3:
                reason = "indoor_no_fix"

        if payload is None and reason:
            payload = _no_fix_payload(settings, reason=reason)
            last_state = "no_fix"

        if payload is None and settings.gnss.enable_ip_fallback and last_state != "fix":
            fb = _ip_fallback()
            if fb:
                payload = _approximate_payload(settings, fb["lat"], fb["lon"])
                last_state = "approximate"

        now = time.time()
        if now - last_heartbeat >= heartbeat_s:
            if payload is None:
                if last_state == "fix":
                    payload = _no_fix_payload(settings, reason="no_fix")
                else:
                    payload = _no_fix_payload(
                        settings, reason=reason or "no_fix"
                    )
            _persist(settings, con, telemetry_path, payload, logger)
            last_heartbeat = now
        elif payload is not None:
            _persist(settings, con, telemetry_path, payload, logger)

        time.sleep(0.05 if raw else read_interval_s)


if __name__ == "__main__":
    main()
