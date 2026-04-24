from __future__ import annotations

import argparse

from buoy.audio.record import CaptureParams, run_capture_loop
from buoy.config import load_settings
from buoy.logging import setup_logging


def main() -> None:
    settings = load_settings()
    logger = setup_logging("buoy.audio_capture")

    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--hw",
        default=settings.audio.device,
        help="Explicit ALSA hw id, e.g. hw:0,0",
    )
    ap.add_argument("--chunk-s", default=settings.audio.chunk_s, type=int)
    ap.add_argument("--rate", default=settings.audio.sample_rate_hz, type=int)
    ap.add_argument("--channels", default=settings.audio.channels, type=int)
    ap.add_argument(
        "--format",
        default=settings.audio.sample_format,
        help="arecord format, e.g. S24_LE",
    )
    args = ap.parse_args()

    params = CaptureParams(
        sample_rate_hz=args.rate,
        channels=args.channels,
        format=args.format,
        chunk_s=args.chunk_s,
    )
    out_dir = settings.paths.data_dir
    index_db_path = settings.paths.data_dir / "index" / "buoy.sqlite"

    logger.info(
        "starting capture node_id=%s out_dir=%s chunk_s=%s rate=%s format=%s",
        settings.node_id,
        out_dir,
        params.chunk_s,
        params.sample_rate_hz,
        params.format,
    )
    run_capture_loop(
        node_id=settings.node_id,
        out_dir=out_dir,
        index_db_path=index_db_path,
        explicit_hw=args.hw,
        params=params,
    )


if __name__ == "__main__":
    main()

