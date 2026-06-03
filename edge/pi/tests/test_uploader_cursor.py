import json
from pathlib import Path

from buoy.services.uploader import _load_cursor_state, _save_cursor_state


def test_uploader_cursor_roundtrip(tmp_path):
    path = tmp_path / "uploader_cursor.json"
    data = {"gnss_jsonl": 42, "last_upload_ok_iso": "2026-06-03T12:00:00Z"}
    _save_cursor_state(path, data)
    loaded = _load_cursor_state(path)
    assert loaded["gnss_jsonl"] == 42
    assert loaded["last_upload_ok_iso"] == "2026-06-03T12:00:00Z"


def test_uploader_cursor_corrupt_returns_empty(tmp_path):
    path = tmp_path / "bad.json"
    path.write_text("not-json", encoding="utf-8")
    assert _load_cursor_state(path) == {}
