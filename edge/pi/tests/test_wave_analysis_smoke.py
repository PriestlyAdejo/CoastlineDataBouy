import pytest

np = pytest.importorskip("numpy")

from buoy.waves.analysis import compute_wave_stats_from_accel_z


def test_compute_wave_stats_runs():
    # Simulate 10 Hz accel with a low-frequency sinusoid.
    fs = 10.0
    t = np.arange(0, 600, 1 / fs)
    t_ms = (t * 1000).astype(int)
    accel = 0.1 * np.sin(2 * np.pi * 0.1 * t)  # 0.1 Hz component
    res = compute_wave_stats_from_accel_z(t_ms=t_ms, accel_z=accel)
    assert res.samples > 0
    assert res.fs_hz > 0

