from __future__ import annotations

from pathlib import Path

try:
    import serial
except ModuleNotFoundError:
    serial = None  # type: ignore[assignment,misc]

from buoy.parsing.nmea import parse_nmea_sentence


def _candidate_ports() -> list[str]:
    out = ["/dev/ttyUSB0", "/dev/ttyUSB1", "/dev/ttyACM0", "/dev/ttyACM1"]
    by_id = Path("/dev/serial/by-id")
    if by_id.exists():
        out.extend(str(p) for p in by_id.glob("*"))
    return out


def detect_gnss_port(explicit_port: str | None, baud: int, timeout_s: float = 1.0) -> str:
    """Detect GNSS port by receiving parseable NMEA lines."""
    if serial is None:
        raise RuntimeError("pyserial not installed")
    ports = [explicit_port] if explicit_port else []
    ports.extend([p for p in _candidate_ports() if p not in ports])
    for port in ports:
        if not port:
            continue
        try:
            with serial.Serial(port=port, baudrate=baud, timeout=timeout_s) as ser:
                for _ in range(20):
                    raw = ser.readline()
                    if not raw:
                        continue
                    line = raw.decode("utf-8", errors="replace").strip()
                    if parse_nmea_sentence(line).payload is not None:
                        return port
        except Exception:
            continue
    raise RuntimeError("No GNSS serial port detected")
