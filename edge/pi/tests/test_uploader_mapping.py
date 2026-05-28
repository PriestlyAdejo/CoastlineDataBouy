from buoy.services.uploader import KIND_TO_ENDPOINT


def test_uploader_endpoint_mapping_contains_core_payloads():
    assert KIND_TO_ENDPOINT["serial_telemetry_jsonl"] == "/ingest/telemetry"
    assert KIND_TO_ENDPOINT["gnss_jsonl"] == "/ingest/telemetry"
    assert KIND_TO_ENDPOINT["env_jsonl"] == "/ingest/env"
    assert KIND_TO_ENDPOINT["health_jsonl"] == "/ingest/health"
