import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts"))

from brighton_replay_engine import (  # noqa: E402
    TEST_POINT,
    build_replay_state,
    location_for_phase,
    parse_phases,
    parse_replay_instant,
    phase_at_instant,
    stable_rng,
)


def _cfg():
    return {
        "test_date": "2026-05-01",
        "phases": [
            {"id": "free_floating", "label": "FREE-FLOATING", "start": "2026-05-01T12:57:00+01:00", "end": "2026-05-01T13:11:00+01:00", "colour": "skyblue"},
            {"id": "anchored_disturbed", "label": "BOAT CIRCLING BUOY", "start": "2026-05-01T13:17:00+01:00", "end": "2026-05-01T13:36:00+01:00", "colour": "salmon"},
        ],
        "measured": {"water_temp_c": 12.0},
    }


def test_free_floating_near_test_point():
    import random

    rng = random.Random(42)
    phases = parse_phases(_cfg())
    instant = parse_replay_instant("2026-05-01T13:00:00+01:00", phases=phases)
    loc = location_for_phase("free_floating", instant, rng, phases)
    assert abs(loc["lat"] - TEST_POINT[0]) < 0.001
    assert abs(loc["lon"] - TEST_POINT[1]) < 0.001


def test_at_timestamp_phase_disturbed():
    state = build_replay_state(_cfg(), at="2026-05-01T13:17:00+01:00", tick=0)
    assert state["phase_id"] == "anchored_disturbed"
    assert "13:17" in state["test_time_local"] or state["phase_label"] == "BOAT CIRCLING BUOY"


def test_replay_state_changes_with_tick():
    a = build_replay_state(_cfg(), at="2026-05-01T12:57:00+01:00", tick=1)
    b = build_replay_state(_cfg(), at="2026-05-01T13:20:00+01:00", tick=20)
    assert a["tick"] != b["tick"]
    assert a["upload"]["files_uploaded"] != b["upload"]["files_uploaded"]


def test_water_temp_near_measured():
    state = build_replay_state(_cfg(), at="2026-05-01T13:00:00+01:00", tick=3)
    assert 11.5 <= state["environment"]["water_temp_c"] <= 12.5
