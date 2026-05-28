from buoy.parsing.nmea import parse_nmea_sentence


def test_parse_gga_sentence():
    line = "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47"
    result = parse_nmea_sentence(line)
    assert result.payload is not None
    assert result.payload["gps"]["fix_quality"] == 1


def test_parse_rmc_sentence():
    line = "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A"
    result = parse_nmea_sentence(line)
    assert result.payload is not None
    assert result.payload["gps"]["status"] == "A"


def test_parse_invalid_sentence():
    result = parse_nmea_sentence("hello")
    assert result.payload is None
