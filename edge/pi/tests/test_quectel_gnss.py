from buoy.parsing.quectel_gnss import is_nmea_sentence, parse_qgpsloc


def test_is_nmea_sentence():
    assert is_nmea_sentence("$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47")
    assert is_nmea_sentence("$GNRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A")
    assert not is_nmea_sentence("AT+QGPSLOC: 084757.0,5150.489980,N,00040.116970,W,1.0,76.3,3")
    assert not is_nmea_sentence("random boot log line")


def test_parse_qgpsloc_hemisphere_format():
    resp = "+QGPSLOC: 084757.0,5150.489980,N,00040.116970,W,1.0,76.3,3,0.00,0.0,160224,07\r\nOK\r\n"
    loc = parse_qgpsloc(resp)
    assert loc is not None
    assert loc["quality"] == "fix"
    assert loc["source"] == "quectel_at"
    assert 51.0 < loc["lat"] < 52.0
    assert -1.0 < loc["lon"] < 0.0
    assert loc.get("satellites") == 7


def test_parse_qgpsloc_no_fix_zeros():
    resp = "+QGPSLOC: 084757.0,0.000000,0.000000,0.0,0.0,0,0.00,0.0,160224,00\r\nOK\r\n"
    loc = parse_qgpsloc(resp)
    assert loc is not None
    assert loc["quality"] == "no_fix"


def test_parse_qgpsloc_decimal_format():
    resp = "+QGPSLOC: 084757.0,50.8248,-0.1380,1.2,10.0,1,0.0,0.0,0.0,160224,8\r\nOK\r\n"
    loc = parse_qgpsloc(resp)
    assert loc is not None
    assert loc["quality"] == "fix"
    assert abs(loc["lat"] - 50.8248) < 0.01
    assert abs(loc["lon"] - (-0.138)) < 0.01
