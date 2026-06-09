from __future__ import annotations

import logging
import time

import serial

from buoy.parsing.serial_payload import parse_serial_payload

LIKELY_PORTS = [
    "/dev/ttyAMA0",
    "/dev/ttyS0",
    "/dev/ttyUSB0",
    "/dev/ttyUSB1",
    "/dev/ttyACM0",
    "/dev/ttyACM1",
]

logger = logging.getLogger("buoy.serial_detect")


def detect_serial_port(
    explicit_port: str | None,
    baud: int,
    timeout_s: float = 1.0,
    *,
    require_parse: bool = True,
) -> str:
    """Select a serial port by validating parseable telemetry output.

    When *require_parse* is False and *explicit_port* is set, return it without probing.
    Auto-detection is best-effort: logs warnings and returns the best candidate rather
    than crashing when no parseable line is seen during the probe window.
    """
    if explicit_port and not require_parse:
        logger.info("using explicit serial port=%s (probe skipped)", explicit_port)
        return explicit_port

    candidates = [explicit_port] if explicit_port else []
    candidates.extend([p for p in LIKELY_PORTS if p not in candidates])

    last_failure: str | None = None
    for port in candidates:
        if not port:
            continue
        try:
            with serial.Serial(port=port, baudrate=baud, timeout=timeout_s) as ser:
                deadline = time.time() + 3.0
                while time.time() < deadline:
                    raw = ser.readline()
                    if not raw:
                        continue
                    line = raw.decode("utf-8", errors="replace").strip()
                    result = parse_serial_payload(line)
                    if result.payload is not None:
                        logger.info("auto_detect success port=%s baud=%s", port, baud)
                        return port
                    last_failure = f"port={port} reason={result.reason} line={line[:120]!r}"
                    logger.warning("auto_detect parse_failed %s", last_failure)
        except Exception as exc:
            last_failure = f"port={port} open_error={exc}"
            logger.warning("auto_detect open_failed port=%s error=%s", port, exc)
            continue

    if explicit_port:
        logger.warning(
            "auto_detect no parseable telemetry; falling back to explicit port=%s (%s)",
            explicit_port,
            last_failure or "no candidates",
        )
        return explicit_port

    fallback = next((p for p in candidates if p), None)
    if fallback:
        logger.warning(
            "auto_detect no parseable telemetry; falling back to port=%s (%s)",
            fallback,
            last_failure or "no candidates",
        )
        return fallback

    raise RuntimeError(
        f"No serial port available for telemetry ingest ({last_failure or 'no candidates'})"
    )
