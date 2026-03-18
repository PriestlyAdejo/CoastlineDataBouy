from __future__ import annotations

import time
from datetime import datetime, timezone
from pathlib import Path

from buoy.config import load_settings
from buoy.logging import setup_logging


def _read_w1_slave(path: Path) -> float | None:
    try:
        txt = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except FileNotFoundError:
        return None
    if len(txt) < 2:
        return None
    if "YES" not in txt[0]:
        return None
    # line 2 contains ... t=23125
    idx = txt[1].rfind("t=")
    if idx < 0:
        return None
    milli_c = int(txt[1][idx + 2 :].strip())
    return milli_c / 1000.0


def main() -> None:
    settings = load_settings()
    logger = setup_logging("buoy.ds18b20d")

    w1_root = settings.ds18b20.w1_root
    poll_s = 10.0

    while True:
        device_dirs = sorted([p for p in w1_root.glob("28-*") if p.is_dir()])
        if not device_dirs:
            logger.warning("ds18b20 not found w1_root=%s", w1_root)
        for dev in device_dirs:
            temp_c = _read_w1_slave(dev / "w1_slave")
            ts = datetime.now(timezone.utc).isoformat()
            if temp_c is None:
                logger.warning("ds18b20 read failed dev=%s ts=%s", dev.name, ts)
            else:
                logger.info("ds18b20 dev=%s ts=%s water_temp_c=%.3f", dev.name, ts, temp_c)
        time.sleep(poll_s)


if __name__ == "__main__":
    main()

