from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class NmeaParseResult:
    """Parsed NMEA sentence to structured GPS fields."""

    payload: dict | None
    reason: str | None = None


def _to_decimal(coord: str, hemi: str) -> float | None:
    if not coord:
        return None
    try:
        if len(coord) < 4:
            return None
        split = 2 if hemi in {"N", "S"} else 3
        deg = float(coord[:split])
        mins = float(coord[split:])
        value = deg + mins / 60.0
        if hemi in {"S", "W"}:
            value = -value
        return value
    except ValueError:
        return None


def _payload(gps: dict, ts_utc: str | None = None) -> dict:
    return {
        "schema_version": "v1",
        "ts": ts_utc or datetime.now(timezone.utc).isoformat(),
        "source": "gnss",
        "gps": gps,
    }


def parse_nmea_sentence(line: str) -> NmeaParseResult:
    """Parse GGA/RMC NMEA lines and return normalized GPS payload."""
    line = line.strip()
    if not line.startswith("$"):
        return NmeaParseResult(None, "not_nmea")
    parts = line.split(",")
    kind = parts[0]
    if kind in {"$GPGGA", "$GNGGA"} and len(parts) >= 10:
        lat = _to_decimal(parts[2], parts[3])
        lon = _to_decimal(parts[4], parts[5])
        if lat is None or lon is None:
            return NmeaParseResult(None, "invalid_coords")
        gps = {
            "lat": lat,
            "lon": lon,
            "fix_quality": int(parts[6] or 0),
            "satellites": int(parts[7] or 0),
            "hdop": float(parts[8]) if parts[8] else None,
            "altitude_m": float(parts[9]) if parts[9] else None,
        }
        return NmeaParseResult(_payload(gps), None)
    if kind in {"$GPRMC", "$GNRMC"} and len(parts) >= 9:
        lat = _to_decimal(parts[3], parts[4])
        lon = _to_decimal(parts[5], parts[6])
        if lat is None or lon is None:
            return NmeaParseResult(None, "invalid_coords")
        gps = {
            "lat": lat,
            "lon": lon,
            "status": parts[2],
            "speed_knots": float(parts[7]) if parts[7] else None,
            "course_deg": float(parts[8]) if parts[8] else None,
        }
        return NmeaParseResult(_payload(gps), None)
    return NmeaParseResult(None, "unsupported_sentence")
