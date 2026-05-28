from buoy.parsing.serial_payload import parse_serial_payload


def test_parse_csv_basic():
    line = "123456,22.1,0.01,0.02,9.81"
    result = parse_serial_payload(line)
    assert result.payload is not None
    assert result.payload["arduino_ms"] == 123456
    assert result.payload["accel_z"] == 9.81


def test_parse_json_basic():
    line = '{"millis":123,"temperature":20.5,"accel_x":1,"accel_y":2,"accel_z":3}'
    result = parse_serial_payload(line)
    assert result.payload is not None
    assert result.payload["arduino_ms"] == 123


def test_parse_bad_line_returns_reason():
    result = parse_serial_payload("badline")
    assert result.payload is None
    assert result.reason is not None
