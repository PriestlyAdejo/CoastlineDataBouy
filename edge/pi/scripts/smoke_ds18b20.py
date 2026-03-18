from __future__ import annotations

from pathlib import Path


def main() -> int:
    w1_root = Path("/sys/bus/w1/devices")
    devs = sorted([p for p in w1_root.glob("28-*") if p.is_dir()])
    if not devs:
        print("DS18B20: not found")
        return 2

    for dev in devs:
        txt = (dev / "w1_slave").read_text(encoding="utf-8", errors="replace").splitlines()
        if len(txt) < 2:
            print(f"{dev.name}: unreadable")
            continue
        ok = "YES" in txt[0]
        t_idx = txt[1].rfind("t=")
        t = None if t_idx < 0 else int(txt[1][t_idx + 2 :]) / 1000.0
        print(f"{dev.name}: crc_ok={ok} temp_c={t}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

