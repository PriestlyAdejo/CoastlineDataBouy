from __future__ import annotations

import hashlib
import json
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from ..logging import setup_logging
from .alsa import AlsaHw, list_capture_hw_devices, pick_hifiberry_like


@dataclass(frozen=True)
class CaptureParams:
    sample_rate_hz: int = 96_000
    channels: int = 1
    format: str = "S24_LE"  # arecord format string
    chunk_s: int = 15 * 60


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def format_chunk_name(node_id: str, ts_start: datetime, ts_end: datetime) -> str:
    s = ts_start.strftime("%Y%m%dT%H%M%SZ")
    e = ts_end.strftime("%H%M%SZ")
    return f"{node_id}_hydrophone_{s}_{e}"


def choose_device(explicit_hw: str | None = None) -> AlsaHw | None:
    devs = list_capture_hw_devices()
    if explicit_hw:
        # allow explicit "hw:X,Y"
        for d in devs:
            if d.hw_id == explicit_hw:
                return d
        return None
    picked = pick_hifiberry_like(devs)
    return picked or (devs[0] if devs else None)


def record_chunk(
    *,
    device_hw: str,
    out_wav_tmp: Path,
    params: CaptureParams,
    seconds: int,
) -> None:
    out_wav_tmp.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "arecord",
        "-D",
        device_hw,
        "-f",
        params.format,
        "-r",
        str(params.sample_rate_hz),
        "-c",
        str(params.channels),
        "-d",
        str(seconds),
        str(out_wav_tmp),
    ]
    subprocess.check_call(cmd)


def write_sidecar_meta(
    *,
    node_id: str,
    ts_start: datetime,
    ts_end: datetime,
    wav_path: Path,
    sha256: str,
    device: AlsaHw,
    params: CaptureParams,
) -> dict:
    meta = {
        "schema_version": "v1",
        "node_id": node_id,
        "ts_start": ts_start.isoformat(),
        "ts_end": ts_end.isoformat(),
        "format": {
            "container": "wav",
            "codec": "pcm_s24le" if params.format.upper().startswith("S24") else "pcm_s16le",
            "sample_rate_hz": params.sample_rate_hz,
            "channels": params.channels,
            "bit_depth": 24 if params.format.upper().startswith("S24") else 16,
        },
        "capture": {"alsa_device": device.hw_id, "alsa_card": device.card_name, "alsa_pcm": device.device_name},
        "artifact": {"path": str(wav_path), "size_bytes": wav_path.stat().st_size, "sha256": sha256},
    }
    return meta


def atomic_rename(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    os.replace(src, dst)


def run_capture_loop(
    *,
    node_id: str,
    out_dir: Path,
    index_db_path: Path,
    explicit_hw: str | None = None,
    params: CaptureParams = CaptureParams(),
) -> None:
    from ..index.sqlite_index import add_artifact, init_db, open_db

    logger = setup_logging("buoy.audio_capture")
    device = choose_device(explicit_hw=explicit_hw)
    if not device:
        raise RuntimeError("no ALSA capture device found (arecord -l empty?)")

    logger.info("selected_device hw=%s card=%s dev=%s", device.hw_id, device.card_name, device.device_name)

    con = open_db(index_db_path)
    init_db(con)

    raw_dir = out_dir / "raw" / "audio"
    meta_dir = out_dir / "raw" / "audio_meta"
    tmp_dir = out_dir / "tmp"

    while True:
        ts_start = now_utc()
        ts_end = ts_start + timedelta(seconds=params.chunk_s)
        base = format_chunk_name(node_id, ts_start, ts_end)
        wav_final = raw_dir / f"{base}.wav"
        meta_final = meta_dir / f"{base}.json"
        wav_tmp = tmp_dir / f"{base}.wav.part"

        try:
            record_chunk(device_hw=device.hw_id, out_wav_tmp=wav_tmp, params=params, seconds=params.chunk_s)
            atomic_rename(wav_tmp, wav_final)
        finally:
            if wav_tmp.exists():
                try:
                    wav_tmp.unlink()
                except OSError:
                    pass

        digest = sha256_file(wav_final)
        meta = write_sidecar_meta(
            node_id=node_id,
            ts_start=ts_start,
            ts_end=ts_end,
            wav_path=wav_final,
            sha256=digest,
            device=device,
            params=params,
        )
        meta_final.parent.mkdir(parents=True, exist_ok=True)
        meta_final.write_text(json.dumps(meta, indent=2), encoding="utf-8")

        add_artifact(
            con,
            node_id=node_id,
            kind="audio_wav",
            path=str(wav_final),
            ts_start=meta["ts_start"],
            ts_end=meta["ts_end"],
            size_bytes=meta["artifact"]["size_bytes"],
            sha256=meta["artifact"]["sha256"],
            meta_json=json.dumps(meta, separators=(",", ":")),
        )

        logger.info(
            "chunk_ok path=%s bytes=%d sha256=%s",
            wav_final,
            meta["artifact"]["size_bytes"],
            meta["artifact"]["sha256"][:12],
        )


