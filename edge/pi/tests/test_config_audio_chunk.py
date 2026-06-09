from pathlib import Path

from buoy.config import load_settings


def _patch_writable_paths(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("BUOY_BASE_DIR", str(tmp_path / "base"))
    monkeypatch.setenv("BUOY_DATA_DIR", str(tmp_path / "data"))


def test_audio_chunk_s_from_env(monkeypatch, tmp_path):
    _patch_writable_paths(monkeypatch, tmp_path)
    monkeypatch.setenv("BUOY_AUDIO_CHUNK_S", "60")
    monkeypatch.delenv("BUOY_AUDIO_CHUNK_SECONDS", raising=False)
    settings = load_settings()
    assert settings.audio.chunk_s == 60


def test_audio_chunk_seconds_alias(monkeypatch, tmp_path):
    _patch_writable_paths(monkeypatch, tmp_path)
    monkeypatch.delenv("BUOY_AUDIO_CHUNK_S", raising=False)
    monkeypatch.setenv("BUOY_AUDIO_CHUNK_SECONDS", "120")
    settings = load_settings()
    assert settings.audio.chunk_s == 120


def test_audio_chunk_s_preferred_over_alias(monkeypatch, tmp_path):
    _patch_writable_paths(monkeypatch, tmp_path)
    monkeypatch.setenv("BUOY_AUDIO_CHUNK_S", "60")
    monkeypatch.setenv("BUOY_AUDIO_CHUNK_SECONDS", "900")
    settings = load_settings()
    assert settings.audio.chunk_s == 60
