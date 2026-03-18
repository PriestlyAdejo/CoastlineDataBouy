from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import signal


@dataclass(frozen=True)
class WaveStatsResult:
    hs_m: float | None
    tp_s: float | None
    tm01_s: float | None
    tz_s: float | None
    samples: int
    gap_pct: float
    fs_hz: float


def _estimate_fs_hz(t_ms: np.ndarray) -> float:
    if t_ms.size < 3:
        return 0.0
    dt = np.diff(t_ms.astype(np.float64)) / 1000.0
    dt = dt[(dt > 0) & (dt < 1.0)]
    if dt.size == 0:
        return 0.0
    return float(1.0 / np.median(dt))


def _gap_pct(t_ms: np.ndarray, fs_hz: float) -> float:
    if t_ms.size < 3 or fs_hz <= 0:
        return 0.0
    dt = np.diff(t_ms.astype(np.float64)) / 1000.0
    exp = 1.0 / fs_hz
    gaps = dt[dt > 1.5 * exp]
    # approximate missing samples fraction
    missing = float(np.sum((gaps / exp) - 1.0))
    return float(np.clip(100.0 * missing / max(1.0, t_ms.size), 0.0, 100.0))


def compute_wave_stats_from_accel_z(
    *,
    t_ms: np.ndarray,
    accel_z: np.ndarray,
    band_hz: tuple[float, float] = (0.05, 0.5),
) -> WaveStatsResult:
    """
    Compute basic wave statistics from vertical acceleration.

    This is an engineering-first implementation intended for buoy IMU-derived wave stats.
    Steps:
    - estimate fs from arduino_ms
    - bandpass acceleration
    - convert to displacement using frequency-domain double integration
    - compute displacement PSD (Welch)
    - compute spectral moments and derived periods
    - Hs ≈ 4*sqrt(m0) where m0 = ∫S_eta(f) df
    """
    t_ms = np.asarray(t_ms)
    accel_z = np.asarray(accel_z, dtype=np.float64)
    n = int(min(t_ms.size, accel_z.size))
    t_ms = t_ms[:n]
    accel_z = accel_z[:n]

    fs_hz = _estimate_fs_hz(t_ms)
    if n < 64 or fs_hz <= 0:
        return WaveStatsResult(
            hs_m=None,
            tp_s=None,
            tm01_s=None,
            tz_s=None,
            samples=n,
            gap_pct=0.0,
            fs_hz=float(fs_hz),
        )

    # Detrend and bandpass
    x = signal.detrend(accel_z, type="constant")
    lo, hi = band_hz
    # Guard against invalid band given fs
    nyq = 0.5 * fs_hz
    if hi >= nyq:
        hi = 0.9 * nyq
    if lo <= 0 or hi <= lo:
        return WaveStatsResult(None, None, None, None, n, _gap_pct(t_ms, fs_hz), float(fs_hz))

    sos = signal.butter(4, [lo, hi], btype="bandpass", fs=fs_hz, output="sos")
    x = signal.sosfiltfilt(sos, x)

    # Frequency-domain double integration: eta(f) = -a(f) / (2πf)^2
    # Avoid f=0.
    freqs, Pxx = signal.welch(x, fs=fs_hz, nperseg=min(1024, n), detrend=False)
    w = 2.0 * np.pi * freqs
    with np.errstate(divide="ignore", invalid="ignore"):
        S_eta = np.where(w > 0, Pxx / (w**4), 0.0)

    # Limit to band for moments
    mask = (freqs >= lo) & (freqs <= hi)
    f = freqs[mask]
    S = S_eta[mask]
    if f.size < 8:
        return WaveStatsResult(None, None, None, None, n, _gap_pct(t_ms, fs_hz), float(fs_hz))

    df = np.mean(np.diff(f))
    m0 = float(np.sum(S) * df)
    m1 = float(np.sum(S * f) * df)
    m2 = float(np.sum(S * (f**2)) * df)

    hs_m = 4.0 * np.sqrt(max(m0, 0.0))

    # Peak period from max S
    f_peak = float(f[np.argmax(S)])
    tp_s = 1.0 / f_peak if f_peak > 0 else None

    tm01_s = (m0 / m1) if m1 > 0 else None
    tz_s = np.sqrt(m0 / m2) if m2 > 0 else None

    return WaveStatsResult(
        hs_m=float(hs_m),
        tp_s=float(tp_s) if tp_s is not None else None,
        tm01_s=float(tm01_s) if tm01_s is not None else None,
        tz_s=float(tz_s) if tz_s is not None else None,
        samples=n,
        gap_pct=_gap_pct(t_ms, fs_hz),
        fs_hz=float(fs_hz),
    )

