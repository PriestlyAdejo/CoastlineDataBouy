from __future__ import annotations

import json
import os
import selectors
import socket
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import serial

from buoy.config import load_settings
from buoy.logging import setup_logging


def parse_csv_line(line: str) -> dict | None:
    """
    v1 parser for the currently described Arduino payload:
      millis_timestamp, temperature, accel_x, accel_y, accel_z

    Returns a TelemetrySample-like dict (not yet enforced with schema validation).
    """
    parts = [p.strip() for p in line.split(",")]
    if len(parts) < 5:
        return None
    try:
        arduino_ms = int(parts[0])
        temp_c = float(parts[1])
        ax = float(parts[2])
        ay = float(parts[3])
        az = float(parts[4])
    except ValueError:
        return None

    return {
        "schema_version": "v1",
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": "arduino_serial1",
        "arduino_ms": arduino_ms,
        "env": {"onboard_temp_c": temp_c},
        "imu": {"accel_mps2": {"x": ax, "y": ay, "z": az}},
    }


@dataclass
class Client:
    sock: socket.socket


def _bind_unix_server(path: Path) -> socket.socket:
    if path.exists():
        path.unlink()
    path.parent.mkdir(parents=True, exist_ok=True)
    srv = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    srv.bind(str(path))
    srv.listen(16)
    srv.setblocking(False)
    return srv


def _safe_unlink(path: Path) -> None:
    try:
        path.unlink()
    except FileNotFoundError:
        pass


def main() -> None:
    settings = load_settings()
    logger = setup_logging("buoy.seriald")

    telemetry_dir = settings.paths.data_dir / "telemetry"
    telemetry_dir.mkdir(parents=True, exist_ok=True)
    out_path = telemetry_dir / "serial_telemetry.jsonl"
    raw_path = telemetry_dir / "serial_raw.log"

    pub_sock_path = settings.paths.base_dir / "run" / "seriald_pub.sock"
    cmd_sock_path = settings.paths.base_dir / "run" / "seriald_cmd.sock"

    port = settings.serial.port
    baud = settings.serial.baud

    logger.info("opening uart port=%s baud=%s", port, baud)

    sel = selectors.DefaultSelector()
    pub_srv = _bind_unix_server(pub_sock_path)
    cmd_srv = _bind_unix_server(cmd_sock_path)
    sel.register(pub_srv, selectors.EVENT_READ, data=("accept", "pub"))
    sel.register(cmd_srv, selectors.EVENT_READ, data=("accept", "cmd"))

    pub_clients: list[Client] = []
    cmd_clients: dict[socket.socket, bytearray] = {}

    try:
        with serial.Serial(port=port, baudrate=baud, timeout=settings.serial.read_timeout_s) as ser:
            logger.info("uart open ok pub_sock=%s cmd_sock=%s", pub_sock_path, cmd_sock_path)
            with out_path.open("a", encoding="utf-8") as f_jsonl, raw_path.open(
                "a", encoding="utf-8"
            ) as f_raw:
                last_log_s = 0.0
                while True:
                    # 1) Serial read (blocking only up to timeout)
                    raw = ser.readline()
                    if raw:
                        try:
                            line = raw.decode("utf-8", errors="replace").strip()
                        except Exception:
                            line = ""
                        if line:
                            f_raw.write(line + "\n")
                            rec = parse_csv_line(line)
                            if rec is None:
                                logger.warning("parse_failed line=%r", line[:200])
                            else:
                                rec["node_id"] = settings.node_id
                                payload = json.dumps(rec, separators=(",", ":")) + "\n"
                                f_jsonl.write(payload)
                                f_jsonl.flush()

                                # Fan-out publish (best-effort)
                                dead: list[Client] = []
                                for c in pub_clients:
                                    try:
                                        c.sock.sendall(payload.encode("utf-8"))
                                    except OSError:
                                        dead.append(c)
                                if dead:
                                    pub_clients = [c for c in pub_clients if c not in dead]
                                    for c in dead:
                                        try:
                                            c.sock.close()
                                        except OSError:
                                            pass

                                now_s = time.time()
                                if now_s - last_log_s > 10.0:
                                    ax = rec["imu"]["accel_mps2"]["x"]
                                    logger.info(
                                        "rx ok arduino_ms=%s ax=%.3f pub_clients=%d cmd_clients=%d",
                                        rec["arduino_ms"],
                                        ax,
                                        len(pub_clients),
                                        len(cmd_clients),
                                    )
                                    last_log_s = now_s

                    # 2) Handle local socket activity (non-blocking)
                    for key, _mask in sel.select(timeout=0):
                        action, kind = key.data
                        if action == "accept":
                            conn, _addr = key.fileobj.accept()
                            conn.setblocking(False)
                            if kind == "pub":
                                pub_clients.append(Client(sock=conn))
                            else:
                                cmd_clients[conn] = bytearray()
                                sel.register(conn, selectors.EVENT_READ, data=("cmd_read", "cmd"))
                        elif action == "cmd_read":
                            conn: socket.socket = key.fileobj
                            buf = cmd_clients.get(conn)
                            if buf is None:
                                continue
                            try:
                                chunk = conn.recv(4096)
                            except OSError:
                                chunk = b""
                            if not chunk:
                                sel.unregister(conn)
                                cmd_clients.pop(conn, None)
                                try:
                                    conn.close()
                                except OSError:
                                    pass
                                continue
                            buf.extend(chunk)
                            while b"\n" in buf:
                                line_b, _, rest = buf.partition(b"\n")
                                cmd_clients[conn] = bytearray(rest)
                                cmd_line = line_b.decode("utf-8", errors="replace").strip()
                                if not cmd_line:
                                    continue
                                # Accept either raw opcodes like "P" or JSON like {"cmd":"P"}
                                opcode = None
                                if cmd_line.startswith("{"):
                                    try:
                                        obj = json.loads(cmd_line)
                                        opcode = obj.get("cmd")
                                    except Exception:
                                        opcode = None
                                else:
                                    opcode = cmd_line
                                if not opcode or not isinstance(opcode, str):
                                    try:
                                        conn.sendall(b'{"ok":false,"error":"bad_cmd"}\n')
                                    except OSError:
                                        pass
                                    continue
                                opcode = opcode.strip()
                                if len(opcode) > 32:
                                    opcode = opcode[:32]
                                ser.write((opcode + "\n").encode("utf-8"))
                                ser.flush()
                                try:
                                    conn.sendall(b'{"ok":true}\n')
                                except OSError:
                                    pass
    finally:
        for c in pub_clients:
            try:
                c.sock.close()
            except OSError:
                pass
        for s in list(cmd_clients.keys()):
            try:
                s.close()
            except OSError:
                pass
        try:
            pub_srv.close()
        except OSError:
            pass
        try:
            cmd_srv.close()
        except OSError:
            pass
        _safe_unlink(pub_sock_path)
        _safe_unlink(cmd_sock_path)


if __name__ == "__main__":
    main()

