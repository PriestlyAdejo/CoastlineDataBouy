from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel, Field


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


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
    auto_detect: bool = True


class GnssConfig(BaseModel):
    port: str = "/dev/ttyUSB0"
    baud: int = 9600
    read_timeout_s: float = 1.0
    auto_detect: bool = True
    interval_s: int = 5
    enable_ip_fallback: bool = False


class Ds18b20Config(BaseModel):
    w1_root: Path = Path("/sys/bus/w1/devices")


class AudioConfig(BaseModel):
    device: str = "hw:3,0"
    sample_rate_hz: int = 96_000
    channels: int = 2
    sample_format: str = "S32_LE"
    chunk_s: int = 15 * 60
    auto_detect: bool = True
    device_hint: str = ""


class EdgeSettings(BaseModel):
    node_id: str = "ucl-buoy"
    paths: Paths = Paths()
    serial: SerialConfig = SerialConfig()
    gnss: GnssConfig = GnssConfig()
    ds18b20: Ds18b20Config = Ds18b20Config()
    audio: AudioConfig = AudioConfig()
    backend_api_base: str = "http://127.0.0.1:8000/v1"
    buoy_upload_token: str = "STRONG_UPLOAD_TOKEN_69420"
    upload_interval_s: int = 5
    health_interval_s: int = 15
    env_interval_s: int = 10


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
            auto_detect=_bool_env(
                "BUOY_SERIAL_AUTO_DETECT",
                bool(SerialConfig.model_fields["auto_detect"].default),
            ),
        ),
        gnss=GnssConfig(
            port=os.getenv("BUOY_GNSS_PORT", GnssConfig.model_fields["port"].default),
            baud=int(os.getenv("BUOY_GNSS_BAUD", str(GnssConfig.model_fields["baud"].default))),
            read_timeout_s=float(
                os.getenv(
                    "BUOY_GNSS_READ_TIMEOUT_S",
                    str(GnssConfig.model_fields["read_timeout_s"].default),
                )
            ),
            auto_detect=_bool_env(
                "BUOY_GNSS_AUTO_DETECT",
                bool(GnssConfig.model_fields["auto_detect"].default),
            ),
            interval_s=int(
                os.getenv("BUOY_GNSS_INTERVAL_S", str(GnssConfig.model_fields["interval_s"].default))
            ),
            enable_ip_fallback=_bool_env(
                "BUOY_ENABLE_LOCATION_IP_FALLBACK",
                bool(GnssConfig.model_fields["enable_ip_fallback"].default),
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
            auto_detect=_bool_env(
                "BUOY_AUDIO_AUTO_DETECT",
                bool(AudioConfig.model_fields["auto_detect"].default),
            ),
            device_hint=os.getenv("BUOY_AUDIO_DEVICE_HINT", AudioConfig.model_fields["device_hint"].default),
        ),
        backend_api_base=os.getenv(
            "BUOY_BACKEND_API_BASE", EdgeSettings.model_fields["backend_api_base"].default
        ),
        buoy_upload_token=os.getenv(
            "BUOY_UPLOAD_TOKEN", EdgeSettings.model_fields["buoy_upload_token"].default
        ),
        upload_interval_s=int(
            os.getenv(
                "BUOY_UPLOAD_INTERVAL_S",
                str(EdgeSettings.model_fields["upload_interval_s"].default),
            )
        ),
        health_interval_s=int(
            os.getenv(
                "BUOY_HEALTH_INTERVAL_S",
                str(EdgeSettings.model_fields["health_interval_s"].default),
            )
        ),
        env_interval_s=int(
            os.getenv("BUOY_ENV_INTERVAL_S", str(EdgeSettings.model_fields["env_interval_s"].default))
        ),
    )
    s.paths.ensure()
    return s

