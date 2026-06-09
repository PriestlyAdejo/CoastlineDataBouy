from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _env_bool(key: str, default: bool = False) -> bool:
    raw = os.environ.get(key, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _env_list(key: str) -> list[str]:
    raw = os.environ.get(key, "").strip()
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def _env_json_list(key: str) -> list[str]:
    raw = os.environ.get(key, "").strip()
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except json.JSONDecodeError:
        pass
    return _env_list(key)


def compute_summary_status(
    *,
    wifi_connected: bool,
    tailscale_online: bool,
    backend_reachable: bool,
    modem_detected: bool,
    connect_attempted: bool,
    connect_success: bool,
    warnings: list[str],
    failures: list[str],
) -> str:
    """Overall handover status — missing 4G alone must not imply total failure."""
    if failures:
        return "FAIL"
    core_ok = (wifi_connected or tailscale_online) and backend_reachable
    if not core_ok:
        return "FAIL"
    if not modem_detected:
        return "WARN"
    if connect_attempted and not connect_success:
        return "WARN"
    if warnings:
        return "WARN"
    return "PASS"


def build_connectivity_report() -> dict[str, Any]:
    """Build connectivity report from CONNECTIVITY_PROBE_* environment variables."""
    wifi_connected = _env_bool("CONNECTIVITY_PROBE_WIFI_CONNECTED")
    tailscale_online = _env_bool("CONNECTIVITY_PROBE_TAILSCALE_ONLINE")
    backend_reachable = _env_bool("CONNECTIVITY_PROBE_BACKEND_REACHABLE")
    modem_detected = _env_bool("CONNECTIVITY_PROBE_MODEM_DETECTED")
    lsusb_modem = _env_bool("CONNECTIVITY_PROBE_LSUSB_MODEM_SIGNATURE")
    apn_configured = _env_bool("CONNECTIVITY_PROBE_APN_CONFIGURED")
    connect_attempted = _env_bool("CONNECTIVITY_PROBE_CONNECT_ATTEMPTED")
    connect_success = _env_bool("CONNECTIVITY_PROBE_CONNECT_SUCCESS")

    warnings = _env_json_list("CONNECTIVITY_PROBE_WARNINGS")
    failures = _env_json_list("CONNECTIVITY_PROBE_FAILURES")

    if not modem_detected and "modem_not_detected" not in warnings:
        warnings.append("modem_not_detected")
    if not lsusb_modem and not modem_detected and "no_ttyusb_or_quectel_lsusb" not in warnings:
        warnings.append("no_ttyusb_or_quectel_lsusb")

    summary_status = compute_summary_status(
        wifi_connected=wifi_connected,
        tailscale_online=tailscale_online,
        backend_reachable=backend_reachable,
        modem_detected=modem_detected,
        connect_attempted=connect_attempted,
        connect_success=connect_success,
        warnings=warnings,
        failures=failures,
    )

    return {
        "schema_version": "v1",
        "node_id": os.environ.get("CONNECTIVITY_PROBE_NODE_ID", "ucl-buoy"),
        "ts": datetime.now(timezone.utc).isoformat(),
        "data_dir": os.environ.get("CONNECTIVITY_PROBE_DATA_DIR", ""),
        "wifi_radio": os.environ.get("CONNECTIVITY_PROBE_WIFI_RADIO", "unknown"),
        "wwan_radio": os.environ.get("CONNECTIVITY_PROBE_WWAN_RADIO", "unknown"),
        "wifi_connected": wifi_connected,
        "default_route_iface": os.environ.get("CONNECTIVITY_PROBE_DEFAULT_ROUTE_IFACE") or None,
        "tailscale_online": tailscale_online,
        "tailscale_ip": os.environ.get("CONNECTIVITY_PROBE_TAILSCALE_IP") or None,
        "backend_reachable": backend_reachable,
        "backend_url": os.environ.get("CONNECTIVITY_PROBE_BACKEND_URL") or None,
        "modem_detected": modem_detected,
        "modem_id": os.environ.get("CONNECTIVITY_PROBE_MODEM_ID") or None,
        "ttyusb_ports": _env_list("CONNECTIVITY_PROBE_TTYUSB_PORTS"),
        "ttyacm_ports": _env_list("CONNECTIVITY_PROBE_TTYACM_PORTS"),
        "lsusb_modem_signature_detected": lsusb_modem,
        "mmcli_modems": _env_json_list("CONNECTIVITY_PROBE_MMCLI_MODEMS"),
        "apn_configured": apn_configured,
        "connect_attempted": connect_attempted,
        "connect_success": connect_success,
        "cellular_connection": os.environ.get("CONNECTIVITY_PROBE_CELLULAR_CONNECTION") or None,
        "cellular_state": os.environ.get("CONNECTIVITY_PROBE_CELLULAR_STATE") or None,
        "active_interfaces": _env_list("CONNECTIVITY_PROBE_ACTIVE_INTERFACES"),
        "warnings": warnings,
        "failures": failures,
        "summary_status": summary_status,
    }


def write_connectivity_report(data_dir: Path, report: dict[str, Any]) -> Path:
    out = data_dir / "telemetry" / "connectivity_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return out


def write_connectivity_report_from_env() -> Path:
    data_dir = Path(os.environ["CONNECTIVITY_PROBE_DATA_DIR"])
    report = build_connectivity_report()
    return write_connectivity_report(data_dir, report)


if __name__ == "__main__":
    try:
        out = write_connectivity_report_from_env()
        print(f"report_written: {out}")
    except Exception as exc:
        print(f"WARN: connectivity report write failed: {exc}")
        raise SystemExit(1) from exc
