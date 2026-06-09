import json
import os
from pathlib import Path

from buoy.hardware.connectivity_probe import (
    build_connectivity_report,
    compute_summary_status,
    write_connectivity_report,
)


def _clear_probe_env(monkeypatch):
    for key in list(os.environ):
        if key.startswith("CONNECTIVITY_PROBE_"):
            monkeypatch.delenv(key, raising=False)


def test_summary_warn_when_modem_missing_but_core_ok():
    status = compute_summary_status(
        wifi_connected=True,
        tailscale_online=True,
        backend_reachable=True,
        modem_detected=False,
        connect_attempted=False,
        connect_success=False,
        warnings=["modem_not_detected"],
        failures=[],
    )
    assert status == "WARN"


def test_summary_fail_when_core_unreachable(monkeypatch):
    status = compute_summary_status(
        wifi_connected=False,
        tailscale_online=False,
        backend_reachable=False,
        modem_detected=False,
        connect_attempted=False,
        connect_success=False,
        warnings=[],
        failures=["backend_unreachable"],
    )
    assert status == "FAIL"


def test_build_report_no_modem(monkeypatch, tmp_path):
    _clear_probe_env(monkeypatch)
    monkeypatch.setenv("CONNECTIVITY_PROBE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("CONNECTIVITY_PROBE_NODE_ID", "test-node")
    monkeypatch.setenv("CONNECTIVITY_PROBE_WIFI_RADIO", "enabled")
    monkeypatch.setenv("CONNECTIVITY_PROBE_WWAN_RADIO", "enabled")
    monkeypatch.setenv("CONNECTIVITY_PROBE_WIFI_CONNECTED", "true")
    monkeypatch.setenv("CONNECTIVITY_PROBE_TAILSCALE_ONLINE", "true")
    monkeypatch.setenv("CONNECTIVITY_PROBE_TAILSCALE_IP", "100.89.114.62")
    monkeypatch.setenv("CONNECTIVITY_PROBE_BACKEND_REACHABLE", "true")
    monkeypatch.setenv("CONNECTIVITY_PROBE_BACKEND_URL", "http://127.0.0.1:8000/v1/healthz")
    monkeypatch.setenv("CONNECTIVITY_PROBE_MODEM_DETECTED", "false")
    monkeypatch.setenv("CONNECTIVITY_PROBE_LSUSB_MODEM_SIGNATURE", "false")
    monkeypatch.setenv("CONNECTIVITY_PROBE_TTYUSB_PORTS", "")
    monkeypatch.setenv("CONNECTIVITY_PROBE_TTYACM_PORTS", "/dev/ttyACM0")
    monkeypatch.setenv("CONNECTIVITY_PROBE_MMCLI_MODEMS", "[]")
    monkeypatch.setenv("CONNECTIVITY_PROBE_APN_CONFIGURED", "false")
    monkeypatch.setenv("CONNECTIVITY_PROBE_CONNECT_ATTEMPTED", "false")
    monkeypatch.setenv("CONNECTIVITY_PROBE_CONNECT_SUCCESS", "false")
    monkeypatch.setenv("CONNECTIVITY_PROBE_DEFAULT_ROUTE_IFACE", "wlan0")
    monkeypatch.setenv("CONNECTIVITY_PROBE_WARNINGS", '["modem_not_detected"]')
    monkeypatch.setenv("CONNECTIVITY_PROBE_FAILURES", "[]")

    report = build_connectivity_report()
    assert report["schema_version"] == "v1"
    assert report["node_id"] == "test-node"
    assert report["wifi_connected"] is True
    assert report["tailscale_online"] is True
    assert report["backend_reachable"] is True
    assert report["modem_detected"] is False
    assert report["ttyusb_ports"] == []
    assert report["ttyacm_ports"] == ["/dev/ttyACM0"]
    assert report["lsusb_modem_signature_detected"] is False
    assert report["mmcli_modems"] == []
    assert report["summary_status"] == "WARN"

    out = write_connectivity_report(tmp_path, report)
    loaded = json.loads(out.read_text(encoding="utf-8"))
    assert loaded["modem_detected"] is False
    assert loaded["summary_status"] == "WARN"


def test_write_report_uses_json_booleans_not_python_literals(tmp_path):
    minimal = {
        "schema_version": "v1",
        "node_id": "n",
        "ts": "2026-06-09T12:00:00+00:00",
        "data_dir": str(tmp_path),
        "wifi_radio": "enabled",
        "wwan_radio": "enabled",
        "wifi_connected": False,
        "default_route_iface": None,
        "tailscale_online": True,
        "backend_reachable": True,
        "modem_detected": False,
        "ttyusb_ports": [],
        "ttyacm_ports": [],
        "lsusb_modem_signature_detected": False,
        "mmcli_modems": [],
        "apn_configured": False,
        "connect_attempted": False,
        "connect_success": False,
        "warnings": ["modem_not_detected"],
        "failures": [],
        "summary_status": "WARN",
    }
    out = write_connectivity_report(tmp_path, minimal)
    text = out.read_text(encoding="utf-8")
    assert "false" in text
    assert "null" in text
    assert "False" not in text
    assert "None" not in text
