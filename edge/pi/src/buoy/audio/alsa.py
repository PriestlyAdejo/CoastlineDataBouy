from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass


@dataclass(frozen=True)
class AlsaHw:
    card: int
    device: int
    card_name: str
    device_name: str
    alsa_id: str | None = None

    @property
    def hw_id(self) -> str:
        return self.alsa_id if self.alsa_id is not None else f"hw:{self.card},{self.device}"


ARECORD_DEVICE_RE = re.compile(
    r"^card\s+(?P<card>\d+):\s+(?P<card_id>[^ ]+)\s+\[(?P<card_name>.+?)\],\s+"
    r"device\s+(?P<dev>\d+):\s+(?P<dev_name>.+?)\s+\[(?P<dev_long>.+?)\]$"
)


def list_capture_hw_devices() -> list[AlsaHw]:
    """
    Parse `arecord -l` for capture-capable hardware devices.

    This is intentionally used instead of fragile assumptions about card numbering.
    """
    try:
        out = subprocess.check_output(["arecord", "-l"], text=True, stderr=subprocess.STDOUT)
    except Exception as e:
        raise RuntimeError(f"failed to run arecord -l: {e}") from e

    devices: list[AlsaHw] = []
    for line in out.splitlines():
        line = line.strip()
        m = ARECORD_DEVICE_RE.match(line)
        if not m:
            continue
        devices.append(
            AlsaHw(
                card=int(m.group("card")),
                device=int(m.group("dev")),
                card_name=m.group("card_name").strip(),
                device_name=m.group("dev_long").strip(),
            )
        )
    return devices


def pick_hifiberry_like(devs: list[AlsaHw]) -> AlsaHw | None:
    """
    Heuristic selection for HiFiBerry DAC2 ADC Pro capture.

    We avoid hardcoding exact names, but prefer devices that look like HiFiBerry/sndrpihifiberry.
    """
    if not devs:
        return None
    preferred = []
    for d in devs:
        name = f"{d.card_name} {d.device_name}".lower()
        score = 0
        if "hifiberry" in name:
            score += 50
        if "dac" in name and "adc" in name:
            score += 25
        if "sndrpihifiberry" in name:
            score += 25
        preferred.append((score, d))
    preferred.sort(key=lambda x: x[0], reverse=True)
    if preferred[0][0] <= 0:
        return None
    return preferred[0][1]


def pick_capture_device(devs: list[AlsaHw], explicit_hw: str | None = None) -> tuple[str | None, str]:
    """Pick ALSA device with explicit override then scored preference order."""
    if explicit_hw:
        return explicit_hw, "explicit"
    if not devs:
        return None, "no_capture_devices"
    ranked: list[tuple[int, AlsaHw]] = []
    for d in devs:
        name = f"{d.card_name} {d.device_name}".lower()
        score = 0
        if "hifiberry" in name or "snd_rpi_hifiberry" in name:
            score += 100
        if "adc" in name:
            score += 60
        if "dac+ adc" in name:
            score += 40
        if "usb audio" in name:
            score += 20
        ranked.append((score, d))
    ranked.sort(key=lambda x: x[0], reverse=True)
    if ranked[0][0] > 0:
        return ranked[0][1].hw_id, "ranked_match"
    return devs[0].hw_id, "first_capture_fallback"

