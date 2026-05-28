from __future__ import annotations

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


def detect_serial_port(explicit_port: str | None, baud: int, timeout_s: float = 1.0) -> str:
    """Select a serial port by validating parseable telemetry output."""
    candidates = [explicit_port] if explicit_port else []
    candidates.extend([p for p in LIKELY_PORTS if p not in candidates])

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
                        return port
        except Exception:
            continue
    raise RuntimeError("No serial port produced parseable telemetry payloads")
