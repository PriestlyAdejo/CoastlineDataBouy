from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from buoy.audio.alsa import list_capture_hw_devices, pick_hifiberry_like
from buoy.audio.record import CaptureParams, record_chunk, sha256_file, write_sidecar_meta


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", default=5, type=int)
    ap.add_argument("--out", default="/tmp/buoy_smoke.wav")
    args = ap.parse_args()

    devs = list_capture_hw_devices()
    if not devs:
        print("No ALSA capture devices found via arecord -l")
        return 2

    picked = pick_hifiberry_like(devs) or devs[0]
    print(f"Selected: {picked.hw_id} ({picked.card_name} / {picked.device_name})")

    out_path = Path(args.out)
    tmp = out_path.with_suffix(out_path.suffix + ".part")
    params = CaptureParams(chunk_s=args.seconds)

    ts_start = datetime.now(timezone.utc)
    ts_end = ts_start
    record_chunk(device_hw=picked.hw_id, out_wav_tmp=tmp, params=params, seconds=args.seconds)
    tmp.replace(out_path)
    ts_end = datetime.now(timezone.utc)

    digest = sha256_file(out_path)
    meta = write_sidecar_meta(
        node_id="smoke",
        ts_start=ts_start,
        ts_end=ts_end,
        wav_path=out_path,
        sha256=digest,
        device=picked,
        params=params,
    )
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

