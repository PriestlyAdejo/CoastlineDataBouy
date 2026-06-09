import json
from pathlib import Path

from buoy.hardware.gnss_probe import (
    candidate_ports,
    minimal_no_device_report,
    run_gnss_probe,
    write_probe_report,
)
from buoy.parsing.quectel_gnss import is_nmea_sentence, parse_at_response


def test_candidate_ports_is_list():
    ports = candidate_ports()
    assert isinstance(ports, list)


def test_nmea_detection_variants():
    assert is_nmea_sentence("$GNGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47")
    assert is_nmea_sentence("$GPGSV,1,1,08,01,40,083,46,02,17,308,41*75")


def test_parse_at_qgpsloc_no_fix_note():
    resp = "+QGPSLOC: 0,0.000000,0.000000,0.0,0.0,0,0.00,0.0,160224,00\r\nOK\r\n"
    parsed = parse_at_response(resp, "AT+QGPSLOC?")
    assert parsed["command"] == "AT+QGPSLOC?"
    assert parsed.get("location", {}).get("quality") == "no_fix" or parsed.get("note")


def test_parse_at_qgps_query():
    resp = "+QGPS: 1\r\nOK\r\n"
    parsed = parse_at_response(resp, "AT+QGPS?")
    assert parsed.get("gnss_enabled") is True


def test_run_gnss_probe_no_device():
    report = run_gnss_probe(enable_gnss=False, nmea_seconds=0.01)
    assert report["outcome"] == "gnss_no_device"
    assert isinstance(report["ports_probed"], list)


def test_write_gnss_probe_report_when_no_device(tmp_path: Path):
    report = minimal_no_device_report(enable_gnss=True)
    out = write_probe_report(tmp_path, report)
    loaded = json.loads(out.read_text(encoding="utf-8"))
    assert loaded["outcome"] == "gnss_no_device"
    assert loaded["enable_gnss_requested"] is True
    text = out.read_text(encoding="utf-8")
    assert "False" not in text
    assert "None" not in text
    assert loaded["nmea_port"] is None
