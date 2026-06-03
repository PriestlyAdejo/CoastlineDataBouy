from __future__ import annotations

import json
import shutil
import socket
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

from buoy.config import load_settings
from buoy.index.sqlite_index import add_artifact, init_db, open_db
from buoy.logging import setup_logging


def _read_cpu_temp() -> float | None:
    p = Path("/sys/class/thermal/thermal_zone0/temp")
    if not p.exists():
        return None
    try:
        return int(p.read_text(encoding="utf-8").strip()) / 1000.0
    except Exception:
        return None


def _service_state(name: str) -> str:
    try:
        out = subprocess.check_output(["systemctl", "is-active", name], text=True).strip()
        return out or "unknown"
    except Exception:
        return "unknown"


def _backend_reachable(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=2.0):
            return True
    except OSError:
        return False


def _internet_online() -> bool:
    try:
        subprocess.check_call(
            ["ping", "-c", "1", "-W", "2", "8.8.8.8"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def _tailscale_ip() -> str | None:
    try:
        out = subprocess.check_output(["tailscale", "ip", "-4"], text=True, timeout=5).strip()
        return out or None
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return None


def _latest_serial_battery(data_dir: Path) -> dict:
    path = data_dir / "telemetry" / "serial_telemetry.jsonl"
    if not path.exists():
        return {"battery_source": "not_available"}
    try:
        lines = path.read_text(encoding="utf-8").strip().splitlines()
        if not lines:
            return {"battery_source": "not_available"}
        row = json.loads(lines[-1])
        pack_v = row.get("pack_v")
        soc = row.get("soc_pct")
        if pack_v is not None or soc is not None:
            return {
                "pack_v": pack_v,
                "soc_pct": soc,
                "battery_source": "measured",
            }
    except (json.JSONDecodeError, OSError):
        pass
    return {"battery_source": "not_available"}


def main() -> None:
    """Collect Pi health snapshots and queue uploads."""
    settings = load_settings()
    logger = setup_logging("buoy.healthd")
    telemetry_path = settings.paths.data_dir / "telemetry" / "health.jsonl"
    telemetry_path.parent.mkdir(parents=True, exist_ok=True)
    con = open_db(settings.paths.data_dir / "index" / "buoy.sqlite")
    init_db(con)
    backend_host = settings.backend_api_base.replace("http://", "").replace("https://", "").split("/")[0]
    host = backend_host.split(":")[0]
    port = int(backend_host.split(":")[1]) if ":" in backend_host else 80

    while True:
        disk = shutil.disk_usage(settings.paths.data_dir)
        battery = _latest_serial_battery(settings.paths.data_dir)
        ts_ip = _tailscale_ip()
        online = _internet_online()
        backend_ok = _backend_reachable(host, port)

        payload = {
            "schema_version": "v1",
            "node_id": settings.node_id,
            "ts": datetime.now(timezone.utc).isoformat(),
            "status": "ok",
            "pi": {
                "cpu_pct": None,
                "mem_pct": None,
                "cpu_temp_c": _read_cpu_temp(),
                "uptime_s": int(time.time()),
            },
            "storage": {
                "mount_ok": settings.paths.data_dir.exists(),
                "mountpoint": str(settings.paths.data_dir),
                "free_bytes": disk.free,
                "used_bytes": disk.used,
                "total_bytes": disk.total,
            },
            "services": {
                "buoy-seriald": _service_state("buoy-seriald"),
                "buoy-ds18b20d": _service_state("buoy-ds18b20d"),
                "buoy-gnssd": _service_state("buoy-gnssd"),
                "buoy-audio-capture": _service_state("buoy-audio-capture"),
                "buoy-wave-derive": _service_state("buoy-wave-derive"),
                "buoy-uploader": _service_state("buoy-uploader"),
            },
            "network": {
                "online": online,
                "backend_reachable": backend_ok,
                "tailscale": ts_ip or "offline",
            },
            **battery,
        }
        line = json.dumps(payload, separators=(",", ":"))
        with telemetry_path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
        add_artifact(
            con,
            node_id=settings.node_id,
            kind="health_jsonl",
            path=str(telemetry_path),
            ts_start=payload["ts"],
            ts_end=payload["ts"],
            meta_json=line,
        )
        logger.info(
            "health_sample_written online=%s backend_reachable=%s tailscale=%s battery_source=%s",
            online,
            backend_ok,
            ts_ip or "offline",
            battery.get("battery_source"),
        )
        time.sleep(max(5, settings.health_interval_s))


if __name__ == "__main__":
    main()
