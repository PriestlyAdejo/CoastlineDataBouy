from __future__ import annotations

import re
from typing import Any

_NMEA_PREFIXES = ("$GPGGA", "$GPRMC", "$GNGGA", "$GNRMC", "$GPGSV", "$GNGSV")


def is_nmea_sentence(line: str) -> bool:
    s = line.strip()
    return any(s.startswith(p) for p in _NMEA_PREFIXES)


def nmea_coord_to_decimal(raw: str, hemi: str) -> float | None:
    """Convert NMEA DDMM.MMMMM to decimal degrees."""
    try:
        val = float(raw)
    except (TypeError, ValueError):
        return None
    deg = int(val / 100)
    minutes = val - deg * 100
    out = deg + minutes / 60.0
    h = (hemi or "").upper()
    if h in {"S", "W"}:
        out = -out
    return out


def parse_qgpsloc(response: str) -> dict[str, Any] | None:
    """
    Parse Quectel AT+QGPSLOC? response into a GPS dict.

    Handles:
    - +QGPSLOC: <utc>,<lat>,<lon>,...
    - +QGPSLOC: <utc>,<lat>,<N/S>,<lon>,<E/W>,...
    """
    text = response.replace("\r", "\n")
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("+QGPSLOC:"):
            continue
        body = line.split(":", 1)[1].strip()
        if not body or body.upper() == "ERROR":
            return None
        parts = [p.strip() for p in body.split(",")]
        if len(parts) < 3:
            return None

        lat: float | None = None
        lon: float | None = None
        hdop: float | None = None
        satellites: int | None = None
        fix_status = "no_fix"

        # Hemisphere-separated format
        if len(parts) >= 5 and parts[2].upper() in {"N", "S"} and parts[4].upper() in {"E", "W"}:
            lat = nmea_coord_to_decimal(parts[1], parts[2])
            lon = nmea_coord_to_decimal(parts[3], parts[4])
            if len(parts) > 5:
                try:
                    hdop = float(parts[5])
                except ValueError:
                    hdop = None
            if len(parts) > 7:
                try:
                    fix_q = int(float(parts[7]))
                    fix_status = "3d" if fix_q > 0 else "no_fix"
                except ValueError:
                    pass
            if len(parts) > 11:
                try:
                    satellites = int(float(parts[11]))
                except ValueError:
                    satellites = None
        else:
            try:
                lat = float(parts[1])
                lon = float(parts[2])
            except ValueError:
                lat = nmea_coord_to_decimal(parts[1], "N")
                lon = nmea_coord_to_decimal(parts[2], "E")
            if len(parts) > 3:
                try:
                    hdop = float(parts[3])
                except ValueError:
                    hdop = None
            if len(parts) > 5:
                try:
                    fix_q = int(float(parts[5]))
                    fix_status = "3d" if fix_q > 0 else "no_fix"
                except ValueError:
                    pass
            if len(parts) > 10:
                try:
                    satellites = int(float(parts[10]))
                except ValueError:
                    satellites = None

        if lat is None or lon is None:
            return None
        if abs(lat) < 0.0001 and abs(lon) < 0.0001:
            return {"quality": "no_fix", "fix_status": "no_fix", "reason": "gnss_no_fix"}

        out: dict[str, Any] = {
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "quality": "fix",
            "fix_status": fix_status,
            "source": "quectel_at",
        }
        if hdop is not None:
            out["hdop"] = hdop
        if satellites is not None:
            out["satellites"] = satellites
        return out
    return None


def parse_at_response(response: str, sent_cmd: str) -> dict[str, Any]:
    """Classify a raw AT exchange for probe reporting."""
    upper = response.upper()
    ok = "OK" in upper
    err = "ERROR" in upper
    result: dict[str, Any] = {
        "command": sent_cmd,
        "ok": ok and not err,
        "error": err,
        "raw_preview": response[:500],
    }
    if sent_cmd.upper() == "AT+QGPS?":
        m = re.search(r"\+QGPS:\s*(\d+)", response, re.I)
        if m:
            result["gnss_enabled"] = m.group(1) == "1"
    if sent_cmd.upper().startswith("AT+QGPSLOC?"):
        loc = parse_qgpsloc(response)
        if loc:
            result["location"] = loc
        elif ok:
            result["note"] = "GNSS engine present but no fix yet"
    if sent_cmd.upper().startswith("AT+QGPSGNMEA"):
        nmea_lines = [ln.strip() for ln in response.splitlines() if is_nmea_sentence(ln)]
        if nmea_lines:
            result["nmea_lines"] = nmea_lines[:5]
    return result
