from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, Field


class Paths(BaseModel):
    """
    Paths are intentionally explicit so we can safely redirect to SSD mounts.

    On the Pi, set base_dir to something like:
    - /var/lib/buoy   (system partition)
    and data_dir to:
    - /mnt/ssd/buoy   (external SSD)
    """

    base_dir: Path = Field(default=Path("/var/lib/buoy"))
    data_dir: Path = Field(default=Path("/mnt/ssd/buoy"))

    def ensure(self) -> None:
        for p in [
            self.base_dir,
            self.data_dir,
            self.data_dir / "raw",
            self.data_dir / "derived",
            self.data_dir / "telemetry",
            self.data_dir / "index",
            self.data_dir / "spool",
            self.base_dir / "run",
            self.base_dir / "log",
        ]:
            p.mkdir(parents=True, exist_ok=True)


class SerialConfig(BaseModel):
    port: str = "/dev/ttyAMA0"
    baud: int = 115200
    read_timeout_s: float = 1.0


class Ds18b20Config(BaseModel):
    w1_root: Path = Path("/sys/bus/w1/devices")


class EdgeSettings(BaseModel):
    node_id: str = "ucl-buoy"
    paths: Paths = Paths()
    serial: SerialConfig = SerialConfig()
    ds18b20: Ds18b20Config = Ds18b20Config()
    backend_api_base: str = "http://127.0.0.1:8000/v1"
    buoy_upload_token: str = "dev-token-change-me"


def load_settings() -> EdgeSettings:
    # v1: keep it simple; later: YAML + env override + validation
    s = EdgeSettings()
    s.paths.ensure()
    return s

