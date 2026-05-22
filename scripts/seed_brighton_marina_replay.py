#!/usr/bin/env python3
"""Brighton Marina partial-measurement replay seeder for Nereus API."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import struct
import sys
import time
import wave
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PROVENANCE_SOURCE = "brighton_marina_2026_05_01_replay"
RNG_SEED_TEXT = "brighton_marina_2026_05_01_ucl-buoy"


class ProvenanceTracker:
    def __init__(self, test_date: str) -> None:
        self.test_date = test_date
        self.measured_fields: list[str] = []
        self.derived_fields: list[str] = []
        self.inferred_fields: list[str] = []
        self.inference_notes: dict[str, str] = {}

    def mark_measured(self, field: str) -> None:
        if field not in self.measured_fields:
            self.measured_fields.append(field)

    def mark_derived(self, field: str) -> None:
        if field not in self.derived_fields:
            self.derived_fields.append(field)

    def mark_inferred(self, field: str, note: str | None = None) -> None:
        if field not in self.inferred_fields:
            self.inferred_fields.append(field)
        if note:
            self.inference_notes[field] = note

    def to_dict(self) -> dict[str, Any]:
        return {
            "source": PROVENANCE_SOURCE,
            "demo_mode": True,
            "test_date": self.test_date,
            "measured_fields": sorted(self.measured_fields),
            "derived_fields": sorted(self.derived_fields),
            "inferred_fields": sorted(self.inferred_fields),
            "inference_notes": dict(self.inference_notes),
        }


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def stable_rng(tick: int = 0) -> random.Random:
    digest = hashlib.sha256(f"{RNG_SEED_TEXT}:{tick}".encode()).hexdigest()
    return random.Random(int(digest[:16], 16))


def load_input(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def is_set(value: Any) -> bool:
    return value is not None


def analyze_wav(path: Path) -> dict[str, Any]:
    with wave.open(str(path), "rb") as wf:
        channels = wf.getnchannels()
        sample_rate_hz = wf.getframerate()
        sampwidth = wf.getsampwidth()
        nframes = wf.getnframes()
        bit_depth = sampwidth * 8
        duration_s = nframes / sample_rate_hz if sample_rate_hz else 0.0
        raw = wf.readframes(min(nframes, sample_rate_hz * 30))

    if not raw:
        rms = 0.0
        peak = 0
    else:
        if sampwidth == 2:
            fmt = f"<{len(raw) // 2}h"
            samples = struct.unpack(fmt, raw)
        elif sampwidth == 4:
            fmt = f"<{len(raw) // 4}i"
            samples = struct.unpack(fmt, raw)
        else:
            fmt = f"<{len(raw)}b"
            samples = struct.unpack(fmt, raw)
        peak = max(abs(s) for s in samples) if samples else 0
        rms = math.sqrt(sum(s * s for s in samples) / len(samples)) if samples else 0.0

    full_scale = float(2 ** (bit_depth - 1) - 1) or 1.0
    rms_dbfs = 20.0 * math.log10(max(rms, 1e-12) / full_scale)
    peak_dbfs = 20.0 * math.log10(max(peak, 1) / full_scale)
    leq_db = round(rms_dbfs + 93.0, 1)
    peak_db = round(peak_dbfs + 93.0, 1)

    sha = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            sha.update(chunk)

    return {
        "path": str(path),
        "size_bytes": path.stat().st_size,
        "sha256": sha.hexdigest(),
        "sample_rate_hz": sample_rate_hz,
        "channels": channels,
        "bit_depth": bit_depth,
        "duration_s": round(duration_s, 3),
        "rms_dbfs": round(rms_dbfs, 1),
        "peak_dbfs": round(peak_dbfs, 1),
        "leq_db": leq_db,
        "peak_db": peak_db,
    }


def collect_wav_metrics(hydrophone_path: Path | None) -> dict[str, Any] | None:
    if hydrophone_path is None:
        return None
    if hydrophone_path.is_file() and hydrophone_path.suffix.lower() == ".wav":
        return analyze_wav(hydrophone_path)
    if hydrophone_path.is_dir():
        wavs = sorted(hydrophone_path.glob("*.wav"))
        if wavs:
            return analyze_wav(wavs[0])
    return None


def resolve_acoustic_metrics(
    measured: dict[str, Any],
    wav: dict[str, Any] | None,
    prov: ProvenanceTracker,
) -> dict[str, Any]:
    metrics = dict(measured.get("acoustic_metrics") or {})
    out: dict[str, Any] = {}

    for key in (
        "leq_db",
        "peak_db",
        "rms_dbfs",
        "peak_dbfs",
        "dominant_band",
        "sample_rate_hz",
        "channels",
        "bit_depth",
        "duration_s",
    ):
        if is_set(metrics.get(key)):
            out[key] = metrics[key]
            prov.mark_measured(f"acoustic_metrics.{key}")
        elif wav and is_set(wav.get(key)):
            out[key] = wav[key]
            prov.mark_derived(f"acoustic_metrics.{key}")

    if "dominant_band" not in out:
        out["dominant_band"] = "broadband"
        prov.mark_inferred("acoustic_metrics.dominant_band", "Sheltered marina replay default.")

    if "leq_db" not in out:
        out["leq_db"] = 58.0
        prov.mark_inferred("acoustic_metrics.leq_db", "Conservative replay display estimate.")
    if "peak_db" not in out:
        out["peak_db"] = 72.0
        prov.mark_inferred("acoustic_metrics.peak_db", "Conservative replay display estimate.")
    if "rms_dbfs" not in out:
        out["rms_dbfs"] = -65.0
        prov.mark_inferred("acoustic_metrics.rms_dbfs", "Conservative replay display estimate.")
    if "peak_dbfs" not in out:
        out["peak_dbfs"] = -32.0
        prov.mark_inferred("acoustic_metrics.peak_dbfs", "Conservative replay display estimate.")
    if "sample_rate_hz" not in out:
        out["sample_rate_hz"] = 96000
        prov.mark_inferred("acoustic_metrics.sample_rate_hz")
    if "channels" not in out:
        out["channels"] = 2
        prov.mark_inferred("acoustic_metrics.channels")
    if "bit_depth" not in out:
        out["bit_depth"] = 32
        prov.mark_inferred("acoustic_metrics.bit_depth")

    return out


def build_health_payload(cfg: dict[str, Any], prov: ProvenanceTracker, ts: str, tick: int) -> dict[str, Any]:
    measured = cfg.get("measured") or {}
    policy = cfg.get("inference_policy") or {}
    rng = stable_rng(tick)
    node_id = cfg["node_id"]

    pi: dict[str, Any] = {}
    for key, default in (("cpu_pct", 15.0), ("mem_pct", 40.0), ("cpu_temp_c", 48.0)):
        if is_set(measured.get(key)):
            pi[key] = measured[key]
            prov.mark_measured(f"health.pi.{key}")
        elif policy.get("allow_inferred_battery", True):
            pi[key] = default + rng.uniform(-2, 2)
            prov.mark_inferred(f"health.pi.{key}", "Replay idle Pi estimate.")

    storage: dict[str, Any] = {"mount_ok": True}
    if is_set(measured.get("storage_mountpoint")):
        storage["mountpoint"] = measured["storage_mountpoint"]
        prov.mark_measured("health.storage.mountpoint")
    else:
        storage["mountpoint"] = "/mnt/harddrive/buoy"
        prov.mark_inferred("health.storage.mountpoint")

    storage["free_bytes"] = int(1_200_000_000_000 * (0.55 + rng.uniform(-0.02, 0.02)))
    storage["total_bytes"] = 2_000_000_000_000
    prov.mark_inferred("health.storage.free_bytes")
    prov.mark_inferred("health.storage.total_bytes")

    payload = {
        "schema_version": "v1",
        "node_id": node_id,
        "ts": ts,
        "status": "ok",
        "pi": pi,
        "storage": storage,
        "provenance": prov.to_dict(),
    }
    return payload


def build_env_payload(cfg: dict[str, Any], prov: ProvenanceTracker, ts: str, tick: int) -> dict[str, Any]:
    measured = cfg.get("measured") or {}
    policy = cfg.get("inference_policy") or {}
    rng = stable_rng(tick + 1)

    env: dict[str, Any] = {
        "schema_version": "v1",
        "node_id": cfg["node_id"],
        "ts": ts,
        "source": "replay",
    }

    if is_set(measured.get("water_temp_c")):
        env["water_temp_c"] = measured["water_temp_c"]
        prov.mark_measured("env.water_temp_c")
    elif policy.get("allow_inferred_environment", True):
        env["water_temp_c"] = round(12.5 + rng.uniform(-0.3, 0.3), 2)
        prov.mark_inferred("env.water_temp_c", "Marina May replay estimate.")

    if is_set(measured.get("enclosure_temp_c")):
        env["enclosure_temp_c"] = measured["enclosure_temp_c"]
        prov.mark_measured("env.enclosure_temp_c")
    elif policy.get("allow_inferred_environment", True):
        env["enclosure_temp_c"] = round(18.0 + rng.uniform(-0.5, 0.5), 2)
        prov.mark_inferred("env.enclosure_temp_c", "Enclosure replay estimate.")

    env["provenance"] = prov.to_dict()
    return env


def build_telemetry_payload(cfg: dict[str, Any], prov: ProvenanceTracker, ts: str, tick: int) -> dict[str, Any]:
    measured = cfg.get("measured") or {}
    policy = cfg.get("inference_policy") or {}
    rng = stable_rng(tick + 2)

    battery: dict[str, Any] = {}
    pack_v = measured.get("battery_pack_v")
    soc = measured.get("battery_soc_pct")

    if is_set(pack_v):
        battery["pack_v"] = pack_v
        prov.mark_measured("telemetry.battery.pack_v")
    elif policy.get("allow_inferred_battery", True):
        battery["pack_v"] = round(12.4 + rng.uniform(-0.05, 0.05), 2)
        prov.mark_inferred("telemetry.battery.pack_v")

    if is_set(soc):
        battery["soc_pct"] = soc
        prov.mark_measured("telemetry.battery.soc_pct")
    elif policy.get("allow_inferred_battery", True):
        battery["soc_pct"] = round(72 + rng.uniform(-1, 1), 1)
        prov.mark_inferred("telemetry.battery.soc_pct")

    imu: dict[str, Any] = {}
    if policy.get("allow_inferred_imu", True):
        phase = tick * 0.15
        ax = round(rng.uniform(-0.05, 0.05), 4)
        ay = round(rng.uniform(-0.05, 0.05), 4)
        az = round(9.81 + rng.uniform(-0.02, 0.02), 4)
        imu = {
            "accel_mps2": {"x": ax, "y": ay, "z": az},
            "gyro_rps": {
                "x": round(math.sin(phase) * 0.01, 5),
                "y": round(math.cos(phase) * 0.01, 5),
                "z": round(rng.uniform(-0.005, 0.005), 5),
            },
        }
        prov.mark_inferred("telemetry.imu", "No measured IMU; deterministic replay motion.")

    payload = {
        "schema_version": "v1",
        "node_id": cfg["node_id"],
        "ts": ts,
        "source": "pi_local",
        "seq": tick,
        "battery": battery,
        "imu": imu,
        "pack_v": battery.get("pack_v"),
        "accel_x": imu.get("accel_mps2", {}).get("x"),
        "accel_y": imu.get("accel_mps2", {}).get("y"),
        "accel_z": imu.get("accel_mps2", {}).get("z"),
        "provenance": prov.to_dict(),
    }
    return payload


def build_acoustic_payload(
    cfg: dict[str, Any],
    prov: ProvenanceTracker,
    ts: str,
    wav: dict[str, Any] | None,
) -> dict[str, Any]:
    measured = cfg.get("measured") or {}
    metrics = resolve_acoustic_metrics(measured, wav, prov)
    node_id = cfg["node_id"]
    duration = metrics.get("duration_s", 60.0)

    bit_depth = int(metrics.get("bit_depth", 32))
    codec = {16: "pcm_s16le", 24: "pcm_s24le", 32: "pcm_s32le"}.get(bit_depth, "pcm_s32le")

    artifact_path = (wav or {}).get("path") or "replay/brighton_marina/sample.wav"
    sha = (wav or {}).get("sha256") or ("0" * 64)
    size_bytes = int((wav or {}).get("size_bytes") or 0)

    display_metrics = {
        "leq_db": metrics.get("leq_db"),
        "peak_db": metrics.get("peak_db"),
        "dominant_band": metrics.get("dominant_band"),
        "rms_dbfs": metrics.get("rms_dbfs"),
        "peak_dbfs": metrics.get("peak_dbfs"),
    }
    prov.inference_notes.setdefault(
        "display_metrics",
        "Replay/dashboard extension; not part of acoustic_chunk_meta v1 schema.",
    )

    payload = {
        "schema_version": "v1",
        "node_id": node_id,
        "ts": ts,
        "ts_start": ts,
        "ts_end": ts,
        "format": {
            "container": "wav",
            "codec": codec,
            "sample_rate_hz": int(metrics.get("sample_rate_hz", 96000)),
            "channels": int(metrics.get("channels", 2)),
            "bit_depth": bit_depth,
        },
        "artifact": {
            "path": artifact_path,
            "size_bytes": size_bytes,
            "sha256": sha,
        },
        "display_metrics": display_metrics,
        "provenance": prov.to_dict(),
    }
    return payload


def build_wave_stats_payload(cfg: dict[str, Any], prov: ProvenanceTracker, ts: str, tick: int) -> dict[str, Any]:
    policy = cfg.get("inference_policy") or {}
    rng = stable_rng(tick + 3)

    hs = None
    tp = None
    measured = cfg.get("measured") or {}
    if is_set(measured.get("hs_m")):
        hs = measured["hs_m"]
        prov.mark_measured("wave_stats.hs_m")
    if is_set(measured.get("tp_s")):
        tp = measured["tp_s"]
        prov.mark_measured("wave_stats.tp_s")

    if hs is None and policy.get("allow_inferred_wave_stats", True):
        hs = round(0.2 + rng.uniform(0, 0.12), 2)
        prov.mark_inferred("wave_stats.hs_m", "Sheltered marina replay; not measured.")
    if tp is None and policy.get("allow_inferred_wave_stats", True):
        tp = round(2.8 + rng.uniform(0, 0.8), 2)
        prov.mark_inferred("wave_stats.tp_s", "Sheltered marina replay; not measured.")

    payload = {
        "schema_version": "v1",
        "node_id": cfg["node_id"],
        "ts": ts,
        "window_s": 900,
        "fs_hz": 50.0,
        "hs_m": hs,
        "tp_s": tp,
        "tm01_s": tp,
        "tz_s": round((tp or 3.0) * 0.85, 2),
        "quality": {
            "samples": 45000,
            "gap_pct": 0.0,
            "notes": "Inferred sheltered marina replay; IMU not measured in field test.",
        },
        "provenance": prov.to_dict(),
    }
    return payload


def post_json(api_base: str, token: str, path: str, payload: dict[str, Any]) -> None:
    url = f"{api_base.rstrip('/')}{path}"
    body = json.dumps(payload).encode("utf-8")
    req = Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "X-Buoy-Token": token},
        method="POST",
    )
    try:
        with urlopen(req, timeout=30) as resp:
            if resp.status != 200:
                raise RuntimeError(f"POST {path} -> HTTP {resp.status}")
    except HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"POST {path} -> HTTP {e.code}: {detail}") from e
    except URLError as e:
        raise RuntimeError(f"POST {path} failed: {e}") from e


def run_tick(
    cfg: dict[str, Any],
    api_base: str,
    token: str,
    hydrophone_path: Path | None,
    tick: int,
) -> None:
    prov = ProvenanceTracker(test_date=str(cfg.get("test_date", "2026-05-01")))
    ts = utc_now_iso()
    wav = collect_wav_metrics(hydrophone_path)

    post_json(api_base, token, "/ingest/health", build_health_payload(cfg, prov, ts, tick))
    post_json(api_base, token, "/ingest/env", build_env_payload(cfg, prov, ts, tick))

    prov_tel = ProvenanceTracker(test_date=prov.test_date)
    post_json(api_base, token, "/ingest/telemetry", build_telemetry_payload(cfg, prov_tel, ts, tick))

    prov_ac = ProvenanceTracker(test_date=prov.test_date)
    post_json(api_base, token, "/ingest/acoustic_meta", build_acoustic_payload(cfg, prov_ac, ts, wav))

    prov_wv = ProvenanceTracker(test_date=prov.test_date)
    post_json(api_base, token, "/ingest/wave_stats", build_wave_stats_payload(cfg, prov_wv, ts, tick))

    print(f"[{ts}] tick={tick} node={cfg['node_id']} posted health/env/telemetry/acoustic_meta/wave_stats")


def main() -> int:
    parser = argparse.ArgumentParser(description="Brighton Marina replay seeder")
    parser.add_argument("--input", required=True, help="Path to seed input JSON")
    parser.add_argument("--api-base", default="http://127.0.0.1:8000/v1")
    parser.add_argument("--token", required=True)
    parser.add_argument("--once", action="store_true", help="Post one tick and exit")
    parser.add_argument("--interval", type=float, default=0, help="Loop interval seconds")
    parser.add_argument("--hydrophone-path", default=None, help="WAV file or directory")
    args = parser.parse_args()

    cfg = load_input(Path(args.input))
    hydro = Path(args.hydrophone_path) if args.hydrophone_path else None

    tick = 0
    if args.once or args.interval <= 0:
        run_tick(cfg, args.api_base, args.token, hydro, tick)
        return 0

    print(f"Replay loop every {args.interval}s (Ctrl+C to stop)")
    try:
        while True:
            run_tick(cfg, args.api_base, args.token, hydro, tick)
            tick += 1
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nStopped.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
