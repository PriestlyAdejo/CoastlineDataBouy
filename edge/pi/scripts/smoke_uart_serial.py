from __future__ import annotations

import argparse
import time

import serial


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="/dev/ttyAMA0")
    ap.add_argument("--baud", default=115200, type=int)
    ap.add_argument("--seconds", default=10, type=int)
    args = ap.parse_args()

    deadline = time.time() + args.seconds
    lines = 0

    with serial.Serial(port=args.port, baudrate=args.baud, timeout=1.0) as ser:
        while time.time() < deadline:
            raw = ser.readline()
            if not raw:
                continue
            line = raw.decode("utf-8", errors="replace").strip()
            if not line:
                continue
            lines += 1
            if lines <= 5:
                print(line)

    hz = lines / max(1, args.seconds)
    print(f"read_lines={lines} rate_hz={hz:.2f}")
    return 0 if lines > 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())

