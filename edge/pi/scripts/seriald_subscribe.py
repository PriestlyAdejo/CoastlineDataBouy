from __future__ import annotations

import argparse
import socket


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--sock",
        default="/var/lib/buoy/run/seriald_pub.sock",
        help="Path to seriald publish socket",
    )
    args = ap.parse_args()

    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
        s.connect(args.sock)
        while True:
            data = s.recv(4096)
            if not data:
                return 0
            print(data.decode("utf-8", errors="replace"), end="")


if __name__ == "__main__":
    raise SystemExit(main())

