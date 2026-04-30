from __future__ import annotations

import os
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


class AudioConfig(BaseModel):
    device: str = "hw:3,0"
    sample_rate_hz: int = 96_000
    channels: int = 2
    sample_format: str = "S32_LE"
    chunk_s: int = 15 * 60


class EdgeSettings(BaseModel):
    node_id: str = "ucl-buoy"
    paths: Paths = Paths()
    serial: SerialConfig = SerialConfig()
    ds18b20: Ds18b20Config = Ds18b20Config()
    audio: AudioConfig = AudioConfig()
    backend_api_base: str = "http://127.0.0.1:8000/v1"
    buoy_upload_token: str = "STRONG_UPLOAD_TOKEN_69420"


def load_settings() -> EdgeSettings:
    # Load defaults, then allow environment overrides for deployment.
    s = EdgeSettings(
        node_id=os.getenv("BUOY_NODE_ID", EdgeSettings.model_fields["node_id"].default),
        paths=Paths(
            base_dir=Path(os.getenv("BUOY_BASE_DIR", str(Paths.model_fields["base_dir"].default))),
            data_dir=Path(os.getenv("BUOY_DATA_DIR", str(Paths.model_fields["data_dir"].default))),
        ),
        serial=SerialConfig(
            port=os.getenv("BUOY_SERIAL_PORT", SerialConfig.model_fields["port"].default),
            baud=int(os.getenv("BUOY_SERIAL_BAUD", str(SerialConfig.model_fields["baud"].default))),
            read_timeout_s=float(
                os.getenv(
                    "BUOY_SERIAL_READ_TIMEOUT_S",
                    str(SerialConfig.model_fields["read_timeout_s"].default),
                )
            ),
        ),
        ds18b20=Ds18b20Config(
            w1_root=Path(
                os.getenv("BUOY_DS18B20_W1_ROOT", str(Ds18b20Config.model_fields["w1_root"].default))
            )
        ),
        audio=AudioConfig(
            device=os.getenv("BUOY_AUDIO_DEVICE", AudioConfig.model_fields["device"].default),
            sample_rate_hz=int(
                os.getenv(
                    "BUOY_AUDIO_SAMPLE_RATE",
                    str(AudioConfig.model_fields["sample_rate_hz"].default),
                )
            ),
            channels=int(
                os.getenv("BUOY_AUDIO_CHANNELS", str(AudioConfig.model_fields["channels"].default))
            ),
            sample_format=os.getenv(
                "BUOY_AUDIO_FORMAT", AudioConfig.model_fields["sample_format"].default
            ),
            chunk_s=int(os.getenv("BUOY_AUDIO_CHUNK_S", str(AudioConfig.model_fields["chunk_s"].default))),
        ),
        backend_api_base=os.getenv(
            "BUOY_BACKEND_API_BASE", EdgeSettings.model_fields["backend_api_base"].default
        ),
        buoy_upload_token=os.getenv(
            "BUOY_UPLOAD_TOKEN", EdgeSettings.model_fields["buoy_upload_token"].default
        ),
    )
    s.paths.ensure()
    return s

