from buoy.hardware.gnss_probe import candidate_ports
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
