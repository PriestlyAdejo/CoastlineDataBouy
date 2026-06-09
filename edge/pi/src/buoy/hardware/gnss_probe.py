from __future__ import annotations

import glob
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import serial
except ModuleNotFoundError:
    serial = None  # type: ignore[assignment,misc]

from buoy.parsing.quectel_gnss import is_nmea_sentence, parse_at_response, parse_qgpsloc


def candidate_ports() -> list[str]:
    ports: list[str] = []
    for pattern in (
        "/dev/ttyUSB*",
        "/dev/ttyACM*",
        "/dev/serial0",
        "/dev/serial/by-id/*",
        "/dev/serial/by-path/*",
    ):
        ports.extend(sorted(glob.glob(pattern)))
    seen: set[str] = set()
    out: list[str] = []
    for p in ports:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def probe_nmea_port(port: str, baud: int = 9600, seconds: float = 8.0) -> dict[str, Any]:
    result: dict[str, Any] = {"port": port, "mode": "nmea", "nmea_seen": False, "sentences": []}
    if serial is None:
        result["error"] = "pyserial_missing"
        return result
    deadline = time.time() + seconds
    try:
        with serial.Serial(port=port, baudrate=baud, timeout=0.5) as ser:
            while time.time() < deadline:
                raw = ser.readline()
                if not raw:
                    continue
                line = raw.decode("utf-8", errors="replace").strip()
                if is_nmea_sentence(line):
                    result["nmea_seen"] = True
                    result["sentences"].append(line[:120])
                    if len(result["sentences"]) >= 5:
                        break
    except Exception as exc:
        result["error"] = str(exc)
    return result


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


def probe_at_port(
    port: str,
    baud: int = 115200,
    *,
    enable_gnss: bool = False,
) -> dict[str, Any]:
    result: dict[str, Any] = {"port": port, "mode": "at", "at_ok": False, "commands": []}
    if serial is None:
        result["error"] = "pyserial_missing"
        return result
    cmds = ["AT", "ATI", "AT+QGPS?"]
    if enable_gnss:
        cmds.append("AT+QGPS=1")
    cmds.extend(["AT+QGPSLOC?", 'AT+QGPSGNMEA="GGA"'])
    try:
        with serial.Serial(port=port, baudrate=baud, timeout=0.5) as ser:
            for cmd in cmds:
                resp = _at_exchange(ser, cmd)
                parsed = parse_at_response(resp, cmd)
                result["commands"].append(parsed)
                if cmd == "AT" and parsed.get("ok"):
                    result["at_ok"] = True
                if parsed.get("location"):
                    result["location"] = parsed["location"]
                if parsed.get("nmea_lines"):
                    result["nmea_via_at"] = parsed["nmea_lines"]
                if parsed.get("note"):
                    result["note"] = parsed["note"]
    except Exception as exc:
        result["error"] = str(exc)
    return result


def run_gnss_probe(*, enable_gnss: bool = False, nmea_seconds: float = 8.0) -> dict[str, Any]:
    """Probe all candidate ports; return structured report."""
    ts = datetime.now(timezone.utc).isoformat()
    ports = candidate_ports()
    port_results: list[dict[str, Any]] = []
    nmea_port: str | None = None
    at_port: str | None = None
    recommendation: dict[str, str] = {}

    for port in ports:
        nmea = probe_nmea_port(port, seconds=nmea_seconds)
        if nmea.get("nmea_seen"):
            nmea_port = port
            port_results.append(nmea)
            continue
        at = probe_at_port(port, enable_gnss=enable_gnss)
        if at.get("at_ok") or at.get("location") or any(
            c.get("gnss_enabled") is not None for c in at.get("commands", [])
        ):
            at_port = port
            port_results.append(at)
        elif at.get("error"):
            port_results.append({"port": port, "skipped": True, "error": at["error"]})

    outcome = "gnss_no_device"
    if nmea_port:
        outcome = "nmea_port"
        recommendation["BUOY_GNSS_PORT"] = nmea_port
        recommendation["BUOY_GNSS_MODE"] = "nmea"
    elif at_port:
        loc = next((p.get("location") for p in port_results if p.get("port") == at_port), None)
        if loc and loc.get("quality") == "fix":
            outcome = "quectel_at_fix"
        else:
            outcome = "gnss_no_fix"
        recommendation["BUOY_GNSS_AT_PORT"] = at_port
        recommendation["BUOY_GNSS_MODE"] = "quectel_at"

    return {
        "schema_version": "v1",
        "ts": ts,
        "outcome": outcome,
        "ports_probed": ports,
        "port_results": port_results,
        "nmea_port": nmea_port,
        "at_port": at_port,
        "recommendation": recommendation,
        "enable_gnss_requested": enable_gnss,
    }


def write_probe_report(data_dir: Path, report: dict[str, Any]) -> Path:
    out = data_dir / "telemetry" / "gnss_probe_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return out
