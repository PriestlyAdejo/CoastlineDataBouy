from buoy.services.gnssd import _no_fix_payload


class _Settings:
    node_id = "ucl-buoy"


def test_no_fix_payload_structure():
    p = _no_fix_payload(_Settings(), reason="indoor_no_fix")
    assert p["node_id"] == "ucl-buoy"
    assert p["gps"]["quality"] == "no_fix"
    assert p["gps"]["reason"] == "indoor_no_fix"
