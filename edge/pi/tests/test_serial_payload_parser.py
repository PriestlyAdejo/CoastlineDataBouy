from buoy.parsing.serial_payload import parse_serial_payload

HANDOVER_SAMPLE_ROW = (
    "9436575,26.21,-0.0319,-0.0103,-1.0024,0.1831,-0.6714,-0.3052,"
    "-10.0000,2.0000,-89.0000,-127.000,3000"
)


def test_parse_csv_basic():
    line = "123456,22.1,0.01,0.02,9.81"
    result = parse_serial_payload(line)
    assert result.payload is not None
    assert result.payload["arduino_ms"] == 123456
    assert result.payload["accel_z"] == 9.81
    assert result.payload["source"] == "arduino_serial"


def test_parse_pcb_13_column_handover_sample():
    result = parse_serial_payload(HANDOVER_SAMPLE_ROW)
    assert result.payload is not None, result.reason
    payload = result.payload
    assert payload["schema_version"] == "v1"
    assert payload["source"] == "serial"
    assert payload["parser_status"] == "ok"
    assert payload["arduino_ms"] == 9436575
    assert payload["onboard_temp_c"] == 26.21
    assert payload["accel_x"] == -0.0319
    assert payload["accel_y"] == -0.0103
    assert payload["accel_z"] == -1.0024
    assert payload["gyro_x"] == 0.1831
    assert payload["gyro_y"] == -0.6714
    assert payload["gyro_z"] == -0.3052
    assert payload["mag_x"] == -10.0
    assert payload["mag_y"] == 2.0
    assert payload["mag_z"] == -89.0
    assert payload["aux_1"] == -127.0
    assert payload["interval_ms"] == 3000
    assert payload["raw"] == HANDOVER_SAMPLE_ROW
    assert len(payload["raw_fields"]) == 13
    assert payload["imu"]["gyro_rps"]["z"] == -0.3052
    assert payload["imu"]["mag_ut"]["x"] == -10.0


def test_parse_json_basic():
    line = '{"millis":123,"temperature":20.5,"accel_x":1,"accel_y":2,"accel_z":3}'
    result = parse_serial_payload(line)
    assert result.payload is not None
    assert result.payload["arduino_ms"] == 123
    assert result.payload["source"] == "serial"


def test_parse_bad_line_returns_reason():
    result = parse_serial_payload("badline")
    assert result.payload is None
    assert result.reason is not None
