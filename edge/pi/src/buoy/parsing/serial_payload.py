from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class ParseResult:
    """Represents a serial line parse outcome."""

    payload: dict | None
    reason: str | None = None


def _build_payload(raw: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    ax = raw.get("accel_x")
    ay = raw.get("accel_y")
    az = raw.get("accel_z")
    return {
        "schema_version": "v1",
        "ts": now,
        "source": "arduino_serial",
        "seq": raw.get("seq"),
        "arduino_ms": raw.get("arduino_ms"),
        "onboard_temp_c": raw.get("onboard_temp_c"),
        "onboard_rh_pct": raw.get("onboard_rh_pct"),
        "accel_x": ax,
        "accel_y": ay,
        "accel_z": az,
        "pack_v": raw.get("pack_v"),
        "imu": {"accel_mps2": {"x": ax, "y": ay, "z": az}},
        "env": {
            "onboard_temp_c": raw.get("onboard_temp_c"),
            "onboard_rh_pct": raw.get("onboard_rh_pct"),
        },
    }


def _parse_csv(parts: list[str]) -> ParseResult:
    if len(parts) < 5:
        return ParseResult(payload=None, reason="csv_requires_5_fields")
    try:
        parsed = {
            "arduino_ms": int(parts[0]),
            "onboard_temp_c": float(parts[1]),
            "accel_x": float(parts[2]),
            "accel_y": float(parts[3]),
            "accel_z": float(parts[4]),
        }
        if len(parts) > 5 and parts[5]:
            parsed["onboard_rh_pct"] = float(parts[5])
        if len(parts) > 6 and parts[6]:
            parsed["pressure_hpa"] = float(parts[6])
        if len(parts) > 7 and parts[7]:
            parsed["pack_v"] = float(parts[7])
        if len(parts) > 8 and parts[8]:
            parsed["seq"] = int(parts[8])
    except ValueError:
        return ParseResult(payload=None, reason="csv_value_error")
    return ParseResult(payload=_build_payload(parsed), reason=None)


def _parse_json_line(line: str) -> ParseResult:
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        return ParseResult(payload=None, reason="json_decode_error")
    if not isinstance(obj, dict):
        return ParseResult(payload=None, reason="json_not_object")
    if "schema_version" in obj and "source" in obj:
        return ParseResult(payload=obj, reason=None)
    mapped = {
        "arduino_ms": obj.get("arduino_ms", obj.get("millis", obj.get("ms", 0))),
        "onboard_temp_c": obj.get("onboard_temp_c", obj.get("temperature", obj.get("temp"))),
        "onboard_rh_pct": obj.get("onboard_rh_pct", obj.get("humidity")),
        "accel_x": obj.get("accel_x"),
        "accel_y": obj.get("accel_y"),
        "accel_z": obj.get("accel_z"),
        "pack_v": obj.get("pack_v", obj.get("battery_v")),
        "seq": obj.get("seq"),
    }
    try:
        mapped["arduino_ms"] = int(mapped["arduino_ms"])
        mapped["onboard_temp_c"] = float(mapped["onboard_temp_c"])
        mapped["accel_x"] = float(mapped["accel_x"])
        mapped["accel_y"] = float(mapped["accel_y"])
        mapped["accel_z"] = float(mapped["accel_z"])
        if mapped.get("onboard_rh_pct") is not None:
            mapped["onboard_rh_pct"] = float(mapped["onboard_rh_pct"])
        if mapped.get("pack_v") is not None:
            mapped["pack_v"] = float(mapped["pack_v"])
        if mapped.get("seq") is not None:
            mapped["seq"] = int(mapped["seq"])
    except (TypeError, ValueError):
        return ParseResult(payload=None, reason="json_mappable_fields_invalid")
    return ParseResult(payload=_build_payload(mapped), reason=None)


def parse_serial_payload(line: str) -> ParseResult:
    """Parse supported serial payloads without throwing to callers."""
    line = line.strip()
    if not line:
        return ParseResult(payload=None, reason="empty_line")
    if line.startswith("{"):
        return _parse_json_line(line)
    return _parse_csv([p.strip() for p in line.split(",")])
