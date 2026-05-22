#!/usr/bin/env python3
"""Brighton Marina field-test replay seeder — time-indexed, phase-aware."""

from __future__ import annotations

import argparse
import json
import sys
import time
import wave
import hashlib
import math
import struct
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from brighton_replay_engine import (
    TEST_POINT,
    build_replay_state,
    build_report_summary,
    fetch_weather_cache,
    instant_to_utc_iso,
    load_weather_cache,
    parse_phases,
    parse_replay_instant,
    phase_by_id,
    provenance_dict,
    stable_rng,
)

EXCLUDED_DEFAULT = {"flac_test.wav"}


def load_input(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def analyze_wav(path: Path) -> dict[str, Any]:
    with wave.open(str(path), "rb") as wf:
        channels = wf.getnchannels()
        sample_rate_hz = wf.getframerate()
        sampwidth = wf.getsampwidth()
        nframes = wf.getnframes()
        bit_depth = sampwidth * 8
        raw = wf.readframes(min(nframes, sample_rate_hz * 30))
    if not raw:
        rms, peak = 0.0, 0
    else:
        fmt = f"<{len(raw) // sampwidth}h" if sampwidth == 2 else f"<{len(raw)}b"
        try:
            samples = struct.unpack(fmt, raw[: len(raw) - len(raw) % struct.calcsize(fmt)])
        except struct.error:
            samples = [0]
        peak = max(abs(s) for s in samples) if samples else 0
        rms = math.sqrt(sum(s * s for s in samples) / len(samples)) if samples else 0.0
    full_scale = float(2 ** (bit_depth - 1) - 1) or 1.0
    rms_dbfs = 20.0 * math.log10(max(rms, 1e-12) / full_scale)
    peak_dbfs = 20.0 * math.log10(max(peak, 1) / full_scale)
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
        "rms_dbfs": round(rms_dbfs, 1),
        "peak_dbfs": round(peak_dbfs, 1),
    }


def collect_wav(hydrophone_path: Path | None, excluded: set[str]) -> dict[str, Any] | None:
    if hydrophone_path is None:
        return None
    paths: list[Path] = [hydrophone_path] if hydrophone_path.is_file() else sorted(hydrophone_path.glob("*.wav"))
    for p in paths:
        if p.name in excluded or "flac_test" in p.name:
            continue
        return analyze_wav(p)
    return None


def post_json(api_base: str, token: str, path: str, payload: dict[str, Any]) -> None:
    url = f"{api_base.rstrip('/')}{path}"
    body = json.dumps(payload).encode("utf-8")
    req = Request(url, data=body, headers={"Content-Type": "application/json", "X-Buoy-Token": token}, method="POST")
    try:
        with urlopen(req, timeout=30) as resp:
            if resp.status != 200:
                raise RuntimeError(f"POST {path} -> HTTP {resp.status}")
    except HTTPError as e:
        raise RuntimeError(f"POST {path} -> HTTP {e.code}: {e.read().decode(errors='replace')}") from e
    except URLError as e:
        raise RuntimeError(f"POST {path} failed: {e}") from e


def build_payloads(
    cfg: dict[str, Any],
    tick: int,
    replay: dict[str, Any],
    wav: dict[str, Any] | None,
) -> dict[str, dict[str, Any]]:
    prov = provenance_dict(cfg, replay)
    node = cfg["node_id"]
    measured = cfg.get("measured") or {}
    mount = measured.get("storage_mountpoint") or "/mnt/harddrive/buoy"
    ts = replay.get("test_time_utc") or instant_to_utc_iso(parse_replay_instant(None, tick=tick))
    rng = stable_rng(f"{ts}:{tick}", "payload")
    loc = replay["location"]
    env = replay["environment"]
    bat = replay["battery"]
    acd = replay["acoustic_display"]
    phase = replay.get("phase") or {}

    health = {
        "schema_version": "v1",
        "node_id": node,
        "ts": ts,
        "test_date": cfg.get("test_date", "2026-05-01"),
        "status": "ok",
        "pi": {
            "cpu_pct": round(14 + rng.uniform(-3, 3), 1),
            "mem_pct": round(38 + rng.uniform(-4, 4), 1),
            "cpu_temp_c": round(46 + rng.uniform(-2, 2), 1),
            "uptime_s": 3600 + tick * 5,
        },
        "storage": {
            "mount_ok": True,
            "mountpoint": mount,
            "free_bytes": int(900_000_000_000 - tick * 50_000_000),
            "total_bytes": 2_000_000_000_000,
        },
        "replay": replay,
        "phase": phase,
        "provenance": prov,
    }

    env_payload = {
        "schema_version": "v1",
        "node_id": node,
        "ts": ts,
        "test_date": cfg.get("test_date", "2026-05-01"),
        "source": "replay",
        "water_temp_c": env["water_temp_c"],
        "enclosure_temp_c": env["enclosure_temp_c"],
        "enclosure_rh_pct": env["enclosure_rh_pct"],
        "pressure_hpa": env["pressure_hpa"],
        "replay": replay,
        "phase": phase,
        "provenance": prov,
    }

    telemetry = {
        "schema_version": "v1",
        "node_id": node,
        "ts": ts,
        "test_date": cfg.get("test_date", "2026-05-01"),
        "source": "pi_local",
        "seq": tick,
        "battery": bat,
        "pack_v": bat["pack_v"],
        "link": replay["upload"],
        "gps": {**replay["gps"], "speed_over_ground_mps": loc.get("speed_over_ground_mps"), "drift_from_anchor_m": loc.get("drift_from_anchor_m"), "anchor_status": loc.get("anchor_status")},
        "imu": {
            "accel_mps2": {"x": round(rng.uniform(-0.05, 0.05), 4), "y": round(rng.uniform(-0.05, 0.05), 4), "z": round(9.81 + rng.uniform(-0.02, 0.02), 4)},
            "gyro_rps": {"x": 0.01, "y": 0.01, "z": 0.0},
            "inferred": True,
        },
        "replay": replay,
        "phase": phase,
        "provenance": prov,
    }

    artifact_path = (wav or {}).get("path") or f"replay/brighton_marina/hydrophone_{replay.get('phase_id', 'segment')}.wav"
    acoustics = {
        "schema_version": "v1",
        "node_id": node,
        "ts": ts,
        "test_date": cfg.get("test_date", "2026-05-01"),
        "ts_start": ts,
        "ts_end": ts,
        "format": {
            "container": "wav",
            "codec": "pcm_s32le",
            "sample_rate_hz": int((wav or {}).get("sample_rate_hz") or 96000),
            "channels": int((wav or {}).get("channels") or 2),
            "bit_depth": int((wav or {}).get("bit_depth") or 32),
        },
        "artifact": {"path": artifact_path, "size_bytes": int((wav or {}).get("size_bytes") or 0), "sha256": (wav or {}).get("sha256") or ("0" * 64)},
        "display_metrics": {
            "leq_db": acd["leq_display_db"],
            "leq_relative_db": acd.get("leq_relative_db", acd["leq_display_db"]),
            "peak_db": acd["peak_display_db"],
            "rms_dbfs": acd["rms_dbfs"],
            "peak_dbfs": acd["peak_dbfs"],
            "dominant_band": acd["dominant_band"],
            "calibration_status": acd["calibration_status"],
            "gain_warning": acd.get("gain_warning", True),
        },
        "replay": replay,
        "phase": phase,
        "provenance": {**prov, "inference_notes": {"display_metrics": "Replay extension; uncalibrated SPL."}},
    }

    wave_stats = {
        "schema_version": "v1",
        "node_id": node,
        "ts": ts,
        "test_date": cfg.get("test_date", "2026-05-01"),
        "window_s": 900,
        "fs_hz": 50.0,
        "hs_m": replay["wave"]["hs_m"],
        "tp_s": replay["wave"]["tp_s"],
        "quality": {"samples": 45000, "gap_pct": 0.0, "notes": "Inferred marina replay; IMU not measured."},
        "replay": replay,
        "phase": phase,
        "provenance": prov,
    }

    return {"health": health, "env": env_payload, "telemetry": telemetry, "acoustics": acoustics, "wave_stats": wave_stats}


def run_tick(
    cfg: dict[str, Any],
    api_base: str,
    token: str,
    hydrophone_path: Path | None,
    tick: int,
    *,
    at: str | None = None,
    interval_s: float = 5.0,
    start_phase: str | None = None,
    replay_speed: float = 1.0,
    weather: dict[str, Any] | None,
    excluded: set[str],
    export_report: Path | None = None,
) -> dict[str, Any]:
    replay = build_replay_state(
        cfg,
        at=at,
        tick=tick,
        interval_s=interval_s,
        start_phase=start_phase,
        replay_speed=replay_speed,
        weather=weather,
    )
    wav = collect_wav(hydrophone_path, excluded)
    payloads = build_payloads(cfg, tick, replay, wav)
    routes = {
        "health": "/ingest/health",
        "env": "/ingest/env",
        "telemetry": "/ingest/telemetry",
        "acoustics": "/ingest/acoustic_meta",
        "wave_stats": "/ingest/wave_stats",
    }
    for key, body in payloads.items():
        post_json(api_base, token, routes[key], body)
    if export_report:
        report = build_report_summary(cfg, replay)
        export_report.parent.mkdir(parents=True, exist_ok=True)
        with export_report.open("w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
    print(
        f"[{replay['test_time_utc']}] tick={tick} node={cfg['node_id']} "
        f"phase={replay['phase_id']} local={replay['test_time_local']} posted all ingests"
    )
    return replay


def resolve_start_instant(cfg: dict[str, Any], args: argparse.Namespace) -> tuple[str | None, int, str | None]:
    phases = parse_phases(cfg)
    if args.at:
        return args.at, 0, None
    if args.phase:
        p = phase_by_id(phases, args.phase)
        if not p:
            raise SystemExit(f"Unknown phase: {args.phase}")
        return p.start.isoformat(), 0, None
    if args.start_phase:
        return None, 0, args.start_phase
    return None, 0, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Brighton Marina field-test replay seeder")
    parser.add_argument("--input", required=True)
    parser.add_argument("--api-base", default="http://127.0.0.1:8000/v1")
    parser.add_argument("--token", required=True)
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--interval", type=float, default=0)
    parser.add_argument("--mode", choices=["live-replay", "single"], default="single")
    parser.add_argument("--at", default=None, help="Exact replay instant e.g. 2026-05-01T13:17:00+01:00")
    parser.add_argument("--phase", default=None, help="Seed at phase start")
    parser.add_argument("--start-phase", default=None, help="Live replay from phase start")
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--hydrophone-path", default=None)
    parser.add_argument("--weather-cache", default=None)
    parser.add_argument("--fetch-weather", action="store_true")
    parser.add_argument("--export-report", default=None)
    args = parser.parse_args()

    cfg = load_input(Path(args.input))
    excluded = set(cfg.get("notes", {}).get("excluded_files") or []) | EXCLUDED_DEFAULT
    hydro = Path(args.hydrophone_path) if args.hydrophone_path else None
    if hydro and hydro.name in excluded:
        hydro = None

    weather_path = Path(args.weather_cache) if args.weather_cache else None
    if args.fetch_weather and weather_path:
        weather = fetch_weather_cache(weather_path, TEST_POINT[0], TEST_POINT[1])
    else:
        weather = load_weather_cache(weather_path)

    at, tick, start_phase = resolve_start_instant(cfg, args)
    export = Path(args.export_report) if args.export_report else None
    live = args.mode == "live-replay" or (args.interval > 0 and not args.once)

    if not live:
        run_tick(cfg, args.api_base, args.token, hydro, tick, at=at, start_phase=start_phase, interval_s=args.interval or 5, replay_speed=args.speed, weather=weather, excluded=excluded, export_report=export)
        return 0

    print(f"Live replay every {args.interval}s (Ctrl+C to stop) speed={args.speed}x")
    try:
        while True:
            run_tick(
                cfg, args.api_base, args.token, hydro, tick,
                at=at, start_phase=start_phase, interval_s=args.interval,
                replay_speed=args.speed, weather=weather, excluded=excluded,
                export_report=export if tick == 0 else None,
            )
            tick += 1
            at = None
            time.sleep(max(args.interval, 0.5) / max(args.speed, 0.1))
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
