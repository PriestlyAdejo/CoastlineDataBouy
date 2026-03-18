from fastapi.testclient import TestClient

from nereus_api.main import app


def test_healthz():
    c = TestClient(app)
    r = c.get("/v1/healthz")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True

