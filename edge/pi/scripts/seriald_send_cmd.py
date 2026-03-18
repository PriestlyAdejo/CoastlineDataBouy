from __future__ import annotations

import argparse
import socket


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--sock",
        default="/var/lib/buoy/run/seriald_cmd.sock",
        help="Path to seriald command socket",
    )
    ap.add_argument("cmd", help="Opcode or JSON line to send, e.g. P or '{\"cmd\":\"P\"}'")
    args = ap.parse_args()

    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
        s.connect(args.sock)
        s.sendall((args.cmd.strip() + "\n").encode("utf-8"))
        resp = s.recv(4096)
        if resp:
            print(resp.decode("utf-8", errors="replace").strip())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

