from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np

from buoy.config import load_settings
from buoy.index.sqlite_index import add_artifact, init_db, open_db
from buoy.logging import setup_logging
from buoy.waves.analysis import compute_wave_stats_from_accel_z


def _load_recent_telemetry(path: Path, since: datetime) -> list[dict]:
    if not path.exists():
        return []
    out: list[dict] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            ts_s = rec.get("ts")
            if not isinstance(ts_s, str):
                continue
            try:
                ts = datetime.fromisoformat(ts_s.replace("Z", "+00:00"))
            except Exception:
                continue
            if ts >= since:
                out.append(rec)
    return out


def main() -> None:
    settings = load_settings()
    logger = setup_logging("buoy.wave_derive")

    ap = argparse.ArgumentParser()
    ap.add_argument("--window-s", default=20 * 60, type=int, help="Analysis window seconds.")
    ap.add_argument("--telemetry", default=None, help="Override path to serial telemetry JSONL.")
    ap.add_argument("--out", default=None, help="Override path to output wave stats JSONL.")
    args = ap.parse_args()

    telemetry_path = (
        Path(args.telemetry)
        if args.telemetry
        else settings.paths.data_dir / "telemetry" / "serial_telemetry.jsonl"
    )
    out_path = (
        Path(args.out) if args.out else settings.paths.data_dir / "telemetry" / "wave_stats.jsonl"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)

    index_db_path = settings.paths.data_dir / "index" / "buoy.sqlite"
    con = open_db(index_db_path)
    init_db(con)

    now = datetime.now(timezone.utc)
    since = now - timedelta(seconds=args.window_s)
    recs = _load_recent_telemetry(telemetry_path, since)
    if not recs:
        logger.warning("no telemetry records in window path=%s since=%s", telemetry_path, since.isoformat())
        return

    t_ms = []
    az = []
    for r in recs:
        ms = r.get("arduino_ms")
        imu = r.get("imu") or {}
        accel = imu.get("accel_mps2") or {}
        z = accel.get("z")
        if isinstance(ms, int) and isinstance(z, (int, float)):
            t_ms.append(ms)
            az.append(float(z))

    if len(t_ms) < 64:
        logger.warning("insufficient samples n=%d", len(t_ms))
        return

    res = compute_wave_stats_from_accel_z(t_ms=np.array(t_ms), accel_z=np.array(az))

    wave = {
        "schema_version": "v1",
        "node_id": settings.node_id,
        "ts": now.isoformat(),
        "window_s": int(args.window_s),
        "fs_hz": float(res.fs_hz),
        "hs_m": res.hs_m,
        "tp_s": res.tp_s,
        "tm01_s": res.tm01_s,
        "tz_s": res.tz_s,
        "quality": {"samples": res.samples, "gap_pct": res.gap_pct},
    }

    out_path.write_text("", encoding="utf-8") if False else None
    with out_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(wave, separators=(",", ":")) + "\n")

    add_artifact(
        con,
        node_id=settings.node_id,
        kind="wave_stats_jsonl",
        path=str(out_path),
        ts_start=since.isoformat(),
        ts_end=now.isoformat(),
        meta_json=json.dumps(wave, separators=(",", ":")),
    )

    logger.info(
        "wave_ok hs_m=%s tp_s=%s tm01_s=%s tz_s=%s fs_hz=%.2f samples=%d gap_pct=%.2f",
        res.hs_m,
        res.tp_s,
        res.tm01_s,
        res.tz_s,
        res.fs_hz,
        res.samples,
        res.gap_pct,
    )


if __name__ == "__main__":
    main()

