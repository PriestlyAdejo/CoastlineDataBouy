from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class ParseResult:
    """Represents a serial line parse outcome."""

    payload: dict | None
    reason: str | None = None


def _build_payload(raw: dict, *, source: str = "arduino_serial", parser_status: str = "ok") -> dict:
    now = datetime.now(timezone.utc).isoformat()
    ax = raw.get("accel_x")
    ay = raw.get("accel_y")
    az = raw.get("accel_z")
    gx = raw.get("gyro_x")
    gy = raw.get("gyro_y")
    gz = raw.get("gyro_z")
    mx = raw.get("mag_x")
    my = raw.get("mag_y")
    mz = raw.get("mag_z")
    payload: dict = {
        "schema_version": "v1",
        "ts": now,
        "source": source,
        "parser_status": parser_status,
        "arduino_ms": raw.get("arduino_ms"),
        "onboard_temp_c": raw.get("onboard_temp_c"),
        "accel_x": ax,
        "accel_y": ay,
        "accel_z": az,
        "imu": {"accel_mps2": {"x": ax, "y": ay, "z": az}},
        "env": {
            "onboard_temp_c": raw.get("onboard_temp_c"),
            "onboard_rh_pct": raw.get("onboard_rh_pct"),
        },
    }
    if gx is not None or gy is not None or gz is not None:
        payload["gyro_x"] = gx
        payload["gyro_y"] = gy
        payload["gyro_z"] = gz
        payload["imu"]["gyro_rps"] = {"x": gx, "y": gy, "z": gz}
    if mx is not None or my is not None or mz is not None:
        payload["mag_x"] = mx
        payload["mag_y"] = my
        payload["mag_z"] = mz
        payload["imu"]["mag_ut"] = {"x": mx, "y": my, "z": mz}
    if raw.get("aux_1") is not None:
        payload["aux_1"] = raw.get("aux_1")
    if raw.get("interval_ms") is not None:
        payload["interval_ms"] = raw.get("interval_ms")
    if raw.get("raw") is not None:
        payload["raw"] = raw.get("raw")
    if raw.get("raw_fields") is not None:
        payload["raw_fields"] = raw.get("raw_fields")
    if raw.get("seq") is not None:
        payload["seq"] = raw.get("seq")
    if raw.get("onboard_rh_pct") is not None:
        payload["onboard_rh_pct"] = raw.get("onboard_rh_pct")
    if raw.get("pack_v") is not None:
        payload["pack_v"] = raw.get("pack_v")
    return payload


def _parse_pcb_csv(parts: list[str], raw_line: str) -> ParseResult:
    """Parse 13-column Arduino Nano 33 BLE Sense PCB CSV telemetry."""
    if len(parts) < 13:
        return ParseResult(payload=None, reason="pcb_csv_requires_13_fields")
    try:
        parsed = {
            "arduino_ms": int(parts[0]),
            "onboard_temp_c": float(parts[1]),
            "accel_x": float(parts[2]),
            "accel_y": float(parts[3]),
            "accel_z": float(parts[4]),
            "gyro_x": float(parts[5]),
            "gyro_y": float(parts[6]),
            "gyro_z": float(parts[7]),
            "mag_x": float(parts[8]),
            "mag_y": float(parts[9]),
            "mag_z": float(parts[10]),
            "aux_1": float(parts[11]),
            "interval_ms": int(float(parts[12])),
            "raw": raw_line,
            "raw_fields": parts,
        }
    except ValueError:
        return ParseResult(payload=None, reason="pcb_csv_value_error")
    return ParseResult(
        payload=_build_payload(parsed, source="serial", parser_status="ok"),
        reason=None,
    )


def _parse_csv(parts: list[str], raw_line: str) -> ParseResult:
    if len(parts) >= 13:
        return _parse_pcb_csv(parts, raw_line)
    if len(parts) < 5:
        return ParseResult(payload=None, reason="csv_requires_5_fields")
    try:
        parsed: dict = {
            "arduino_ms": int(parts[0]),
            "onboard_temp_c": float(parts[1]),
            "accel_x": float(parts[2]),
            "accel_y": float(parts[3]),
            "accel_z": float(parts[4]),
            "raw": raw_line,
            "raw_fields": parts,
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
        "gyro_x": obj.get("gyro_x"),
        "gyro_y": obj.get("gyro_y"),
        "gyro_z": obj.get("gyro_z"),
        "mag_x": obj.get("mag_x"),
        "mag_y": obj.get("mag_y"),
        "mag_z": obj.get("mag_z"),
        "pack_v": obj.get("pack_v", obj.get("battery_v")),
        "seq": obj.get("seq"),
        "raw": line,
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
        for axis in ("gyro_x", "gyro_y", "gyro_z", "mag_x", "mag_y", "mag_z"):
            if mapped.get(axis) is not None:
                mapped[axis] = float(mapped[axis])
    except (TypeError, ValueError):
        return ParseResult(payload=None, reason="json_mappable_fields_invalid")
    return ParseResult(payload=_build_payload(mapped, source="serial"), reason=None)


def parse_serial_payload(line: str) -> ParseResult:
    """Parse supported serial payloads without throwing to callers."""
    line = line.strip()
    if not line:
        return ParseResult(payload=None, reason="empty_line")
    if line.startswith("{"):
        return _parse_json_line(line)
    parts = [p.strip() for p in line.split(",")]
    return _parse_csv(parts, line)
