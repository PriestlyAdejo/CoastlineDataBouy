"""Time-indexed Brighton Marina field-test replay engine (backend + report source of truth)."""

from __future__ import annotations

import hashlib
import json
import math
import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.request import urlopen
from zoneinfo import ZoneInfo

RNG_SEED_TEXT = "brighton_marina_2026_05_01_ucl-buoy"
MARINA_REF = (50.808166, -0.124052)
TEST_POINT = (50.80675, -0.12635)
LONDON = ZoneInfo("Europe/London")
TEST_DATE = "2026-05-01"
REPLAY_MODE = "brighton-marina-2026-05-01"

DAY_START = datetime(2026, 5, 1, 0, 0, 0, tzinfo=LONDON)
DAY_END = datetime(2026, 5, 1, 23, 59, 59, tzinfo=LONDON)


@dataclass
class Phase:
    key: str
    label: str
    start: datetime
    end: datetime
    color: str
    description: str = ""


def stable_rng(seed_key: str, salt: str = "") -> random.Random:
    digest = hashlib.sha256(f"{RNG_SEED_TEXT}:{seed_key}:{salt}".encode()).hexdigest()
    return random.Random(int(digest[:16], 16))


def _parse_dt(value: str) -> datetime:
    v = value.strip().replace("Z", "+00:00")
    if "+" not in v[10:] and v.endswith("Z"):
        v = v[:-1] + "+00:00"
    if "+" not in v[10:] and "-" not in v[10:]:
        return datetime.fromisoformat(v).replace(tzinfo=LONDON)
    dt = datetime.fromisoformat(v)
    return dt.astimezone(LONDON) if dt.tzinfo else dt.replace(tzinfo=LONDON)


def default_phases() -> list[Phase]:
    raw = [
        ("pre_record", "PRE", "2026-05-01T00:00:00", "2026-05-01T12:37:00", "lightgrey", "Pre-record"),
        ("on_land", "LAND", "2026-05-01T12:37:00", "2026-05-01T12:38:00", "tan", "On land"),
        ("on_boat_pre", "ON-BOAT", "2026-05-01T12:38:00", "2026-05-01T12:57:00", "lightsteelblue", "On boat pre"),
        ("free_floating", "FREE-FLOATING", "2026-05-01T12:57:00", "2026-05-01T13:11:00", "skyblue", "Free floating"),
        ("on_boat_mid", "BOAT", "2026-05-01T13:11:00", "2026-05-01T13:14:00", "lightsteelblue", "On boat mid"),
        ("anchored_quiet", "ANCHORED", "2026-05-01T13:14:00", "2026-05-01T13:17:00", "lightgreen", "Anchored quiet"),
        ("anchored_disturbed", "BOAT CIRCLING BUOY", "2026-05-01T13:17:00", "2026-05-01T13:36:00", "salmon", "Boat circling"),
        ("post_test", "ON-BOAT", "2026-05-01T13:36:00", "2026-05-01T13:53:00", "lightsteelblue", "Post test"),
        ("after_test", "DOCK", "2026-05-01T13:53:00", "2026-05-01T23:59:59", "lightgrey", "After test"),
    ]
    return [
        Phase(k, lbl, _parse_dt(s), _parse_dt(e), c, d)
        for k, lbl, s, e, c, d in raw
    ]


def parse_phases(cfg: dict[str, Any]) -> list[Phase]:
    raw = cfg.get("phases") or cfg.get("deployment_phases") or []
    if not raw:
        return default_phases()
    out: list[Phase] = []
    for p in raw:
        key = str(p.get("id") or p.get("key"))
        start_s = p.get("start") or p.get("start_local") or p.get("start_utc")
        end_s = p.get("end") or p.get("end_local") or p.get("end_utc")
        if not start_s or not end_s:
            continue
        out.append(
            Phase(
                key=key,
                label=str(p.get("label", key)),
                start=_parse_dt(str(start_s)),
                end=_parse_dt(str(end_s)),
                color=str(p.get("colour") or p.get("color") or p.get("display_colour", "lightgrey")),
                description=str(p.get("description", "")),
            )
        )
    return sorted(out, key=lambda x: x.start)


def parse_replay_instant(
    at: str | datetime | None = None,
    *,
    tick: int = 0,
    interval_s: float = 5.0,
    start_phase: str | None = None,
    phases: list[Phase] | None = None,
) -> datetime:
    phases = phases or default_phases()
    if at is not None:
        if isinstance(at, datetime):
            instant = at.astimezone(LONDON)
        else:
            instant = _parse_dt(at)
        return max(DAY_START, min(instant, DAY_END))
    if start_phase:
        for p in phases:
            if p.key == start_phase:
                return p.start + timedelta(seconds=tick * max(interval_s, 1.0))
    elapsed = tick * max(interval_s, 1.0)
    span = (DAY_END - DAY_START).total_seconds()
    return DAY_START + timedelta(seconds=min(elapsed, span))


def phase_at_instant(phases: list[Phase], instant: datetime) -> Phase:
    instant = instant.astimezone(LONDON)
    for p in phases:
        if p.start <= instant < p.end:
            return p
    return phases[-1] if phases else Phase("unknown", "UNKNOWN", instant, instant, "lightgrey")


def phase_by_id(phases: list[Phase], phase_id: str) -> Phase | None:
    for p in phases:
        if p.key == phase_id or p.key == phase_id.replace("-", "_"):
            return p
    return None


def instant_to_utc_iso(instant: datetime) -> str:
    return instant.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def format_local_bst(instant: datetime) -> str:
    loc = instant.astimezone(LONDON)
    return loc.replace(microsecond=0).isoformat()


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * max(0.0, min(1.0, t))


def _offset_meters(lat: float, lon: float, east_m: float, north_m: float) -> tuple[float, float]:
    dlat = north_m / 111_320.0
    dlon = east_m / (111_320.0 * math.cos(math.radians(lat)) or 1e-6)
    return lat + dlat, lon + dlon


def _phase_progress(phase: Phase, instant: datetime) -> float:
    span = max((phase.end - phase.start).total_seconds(), 1.0)
    return max(0.0, min(1.0, (instant - phase.start).total_seconds() / span))


def location_for_phase(
    phase_key: str,
    instant: datetime,
    rng: random.Random,
    phases: list[Phase] | None = None,
) -> dict[str, Any]:
    marina_lat, marina_lon = MARINA_REF
    test_lat, test_lon = TEST_POINT
    phases = phases or default_phases()

    if phase_key in ("pre_record", "after_test"):
        lat, lon = marina_lat, marina_lon
        anchor, drift_24h, sog, drift_anchor = "dock", 0.0, 0.0, 0.0
    elif phase_key == "on_land":
        lat, lon = marina_lat, marina_lon
        anchor, drift_24h, sog, drift_anchor = "land", 0.0, 0.0, 0.0
    elif phase_key == "on_boat_pre":
        p = phase_by_id(phases, "on_boat_pre") or phases[2]
        t = _phase_progress(p, instant)
        lat, lon = _lerp(marina_lat, test_lat, 0.2 + 0.7 * t), _lerp(marina_lon, test_lon, 0.2 + 0.7 * t)
        lat += rng.uniform(-0.00002, 0.00002)
        lon += rng.uniform(-0.00002, 0.00002)
        anchor, drift_24h, sog, drift_anchor = "transit", rng.uniform(0.1, 0.5), rng.uniform(0.3, 1.2), rng.uniform(5, 25)
    elif phase_key == "free_floating":
        lat, lon = _offset_meters(test_lat, test_lon, rng.uniform(-35, 35), rng.uniform(-35, 35))
        anchor, drift_24h, sog, drift_anchor = "drifting", rng.uniform(3.0, 12.0), rng.uniform(0.1, 0.6), rng.uniform(15, 45)
    elif phase_key == "on_boat_mid":
        lat, lon = _offset_meters(test_lat, test_lon, rng.uniform(-12, 12), rng.uniform(-12, 12))
        anchor, drift_24h, sog, drift_anchor = "transit", rng.uniform(0.5, 2.5), rng.uniform(0.2, 0.8), rng.uniform(8, 20)
    elif phase_key == "anchored_quiet":
        lat, lon = _offset_meters(test_lat, test_lon, rng.uniform(-3, 3), rng.uniform(-3, 3))
        anchor, drift_24h, sog, drift_anchor = "moored", rng.uniform(0.05, 0.4), rng.uniform(0.0, 0.15), rng.uniform(0.5, 3)
    elif phase_key == "anchored_disturbed":
        lat, lon = _offset_meters(test_lat, test_lon, rng.uniform(-10, 10), rng.uniform(-10, 10))
        anchor, drift_24h, sog, drift_anchor = "moored_disturbed", rng.uniform(0.4, 1.8), rng.uniform(0.05, 0.35), rng.uniform(2, 12)
    elif phase_key == "post_test":
        p = phase_by_id(phases, "post_test") or phases[-2]
        t = _phase_progress(p, instant)
        lat, lon = _lerp(test_lat, marina_lat, t), _lerp(test_lon, marina_lon, t)
        anchor, drift_24h, sog, drift_anchor = "transit", rng.uniform(0.2, 1.2), rng.uniform(0.2, 0.9), rng.uniform(5, 18)
    else:
        lat, lon, anchor, drift_24h, sog, drift_anchor = test_lat, test_lon, "unknown", 0.0, 0.0, 0.0

    return {
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "uncertainty_radius_m": 50,
        "position_source": "inferred_replay",
        "anchor_state": anchor,
        "anchor_status": anchor,
        "drift_m_24h": round(drift_24h, 2),
        "drift_m_24h_est": round(drift_24h, 2),
        "drift_from_anchor_m": round(drift_anchor, 1),
        "speed_over_ground_mps": round(sog, 3),
        "marina_reference": {"lat": marina_lat, "lon": marina_lon},
        "test_point": {"lat": test_lat, "lon": test_lon},
    }


def files_index(instant: datetime, phase_key: str, tick: int) -> list[dict[str, Any]]:
    hhmm = instant.astimezone(LONDON).strftime("%H%M")
    date_label = "1 May 2026"
    base = [
        {"name": f"brighton_marina_replay_telemetry_2026-05-01_{hhmm}.csv", "category": "telemetry", "size_bytes": 420000 + tick * 8000, "date": date_label, "provenance": "replay_metadata_only", "upload_status": "indexed"},
        {"name": "brighton_marina_field_notes_2026-05-01.json", "category": "sensor", "size_bytes": 8400 + tick * 100, "date": date_label, "provenance": "replay_metadata_only", "upload_status": "uploaded"},
        {"name": "brighton_marina_wave_stats_2026-05-01.json", "category": "sensor", "size_bytes": 6200, "date": date_label, "provenance": "inferred_replay", "upload_status": "uploaded"},
        {"name": "brighton_marina_system_health_2026-05-01.log", "category": "system", "size_bytes": 180000 + tick * 500, "date": date_label, "provenance": "replay_metadata_only", "upload_status": "uploaded"},
        {"name": "brighton_marina_replay_summary_2026-05-01.json", "category": "system", "size_bytes": 12000, "date": date_label, "provenance": "replay_export", "upload_status": "uploaded"},
    ]
    if phase_key == "free_floating":
        base.insert(0, {"name": "brighton_marina_hydrophone_2026-05-01_1257_free_floating.wav", "category": "audio", "size_bytes": 0, "date": date_label, "provenance": "not_uploaded_yet", "upload_status": "pending"})
    else:
        base.insert(0, {"name": f"brighton_marina_hydrophone_2026-05-01_{hhmm}.wav", "category": "audio", "size_bytes": max(0, tick * 12000), "date": date_label, "provenance": "replay_metadata_only", "upload_status": "pending" if tick < 3 else "uploaded"})
    return base


def alerts_for_instant(instant: datetime, tick: int, phase_key: str) -> list[dict[str, Any]]:
    time_label = instant.astimezone(LONDON).strftime("%H:%M BST")
    alerts = [
        {"id": "BR-GAIN-001", "title": "Hydrophone gain uncalibrated", "description": "Absolute SPL/Leq are replay/relative unless calibrated gain is supplied.", "severity": "warning", "source": "Acoustic", "time": time_label, "acknowledged": False},
        {"id": "BR-IMU-001", "title": "IMU/wave data inferred", "description": "No measured IMU for Brighton test; motion/wave fields are replay-inferred.", "severity": "info", "source": "Replay", "time": time_label, "acknowledged": True},
    ]
    if phase_key == "anchored_disturbed":
        alerts.append({"id": f"BR-VESSEL-{tick:04d}", "title": "Vessel disturbance detected", "description": "Boat circling buoy phase — elevated broadband acoustic activity.", "severity": "warning", "source": "Acoustic", "time": time_label, "acknowledged": False})
    if phase_key == "free_floating":
        alerts.append({"id": f"BR-GPS-{tick:04d}", "title": "FREE-FLOATING deployment", "description": "Drifting near test point SW of marina.", "severity": "info", "source": "GPS", "time": time_label, "acknowledged": False})
    if phase_key == "anchored_quiet":
        alerts.append({"id": f"BR-ANCHOR-{tick:04d}", "title": "Anchor stable", "description": "Low drift moored state at test point.", "severity": "info", "source": "GPS", "time": time_label, "acknowledged": True})
    if tick % 4 == 0:
        alerts.append({"id": f"BR-UP-{tick:04d}", "title": "Upload queue progressing", "description": "Replay ingest/uploader accepting packets.", "severity": "info", "source": "Upload", "time": time_label, "acknowledged": True})
    return alerts


def build_phase_block(phase: Phase) -> dict[str, Any]:
    return {
        "phase_id": phase.key,
        "phase_key": phase.key,
        "phase_label": phase.label,
        "phase_color": phase.color,
        "description": phase.description,
        "start_local": format_local_bst(phase.start),
        "end_local": format_local_bst(phase.end),
    }


def build_replay_meta_block(
    instant: datetime,
    phase: Phase,
    tick: int,
    *,
    replay_speed: float = 1.0,
    paused: bool = False,
) -> dict[str, Any]:
    utc = instant_to_utc_iso(instant)
    local = format_local_bst(instant)
    if not local.endswith("+01:00") and not local.endswith("+00:00"):
        local = instant.astimezone(LONDON).strftime("%Y-%m-%dT%H:%M:%S+01:00")
    return {
        "mode": REPLAY_MODE,
        "tick": tick,
        "seq": tick,
        "test_date": TEST_DATE,
        "test_time_local": local,
        "test_time_utc": utc,
        "phase_id": phase.key,
        "phase_key": phase.key,
        "phase_label": phase.label,
        "phase_color": phase.color,
        "replay_speed": replay_speed,
        "is_replay": True,
        "paused": paused,
        "simulated_instant_utc": utc,
    }


def build_replay_state(
    cfg: dict[str, Any],
    *,
    at: str | datetime | None = None,
    tick: int = 0,
    interval_s: float = 5.0,
    start_phase: str | None = None,
    replay_speed: float = 1.0,
    paused: bool = False,
    weather: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build full replay state at a specific field-test instant."""
    phases = parse_phases(cfg)
    instant = parse_replay_instant(at, tick=tick, interval_s=interval_s, start_phase=start_phase, phases=phases)
    phase = phase_at_instant(phases, instant)
    seed_key = f"{instant.isoformat()}:{tick}"
    rng = stable_rng(seed_key, phase.key)

    day_progress = (instant - DAY_START).total_seconds() / max((DAY_END - DAY_START).total_seconds(), 1.0)
    loc = location_for_phase(phase.key, instant, rng, phases)

    acoustic_profiles: dict[str, tuple[float, float, int, float]] = {
        "pre_record": (48.0, -62.0, 0, 0.3),
        "on_land": (50.0, -60.0, 1, 0.4),
        "on_boat_pre": (58.0, -50.0, 5, 0.8),
        "free_floating": (55.0, -52.0, 4, 0.6),
        "on_boat_mid": (57.0, -51.0, 4, 0.7),
        "anchored_quiet": (52.0, -58.0, 2, 0.2),
        "anchored_disturbed": (65.0, -44.0, 12, 1.2),
        "post_test": (56.0, -51.0, 4, 0.5),
        "after_test": (49.0, -61.0, 1, 0.25),
    }
    leq, rms, events, motion = acoustic_profiles.get(phase.key, (54.0, -55.0, 3, 0.4))
    leq += rng.uniform(-1.5, 1.5)
    rms += rng.uniform(-1.0, 1.0)

    measured = cfg.get("measured") or {}
    water = float(measured.get("water_temp_c") or 12.0) + rng.uniform(-0.2, 0.2)
    water = max(11.8, min(12.3, water))
    am = measured.get("acoustic_metrics") or {}

    wave_hs = 0.22 + motion * 0.15
    if weather and weather.get("wave_height_m"):
        wave_hs = float(weather["wave_height_m"]) * (0.8 + motion * 0.4)

    files_up = 6 + int(day_progress * 40) + tick
    files_pending = max(0, 4 - tick // 6)

    replay_meta = build_replay_meta_block(instant, phase, tick, replay_speed=replay_speed, paused=paused)
    phase_block = build_phase_block(phase)

    state = {
        **replay_meta,
        "phase": phase_block,
        "location": loc,
        "gps": {
            "lat": loc["lat"],
            "lon": loc["lon"],
            "fix": "3D" if phase.key not in ("pre_record",) else "2D",
            "satellites": 6 + int(rng.uniform(0, 4)),
            "hdop": round(0.6 + rng.uniform(0, 0.9), 1),
            "drift_m_24h": loc["drift_m_24h"],
            "phase_label": phase.label,
            "phase_key": phase.key,
        },
        "upload": {
            "backend_reachable": True,
            "backend_api_base": "http://127.0.0.1:8000/v1",
            "packet_delivery_rate": round(0.982 + rng.uniform(0, 0.016), 3),
            "files_seen": files_up + files_pending,
            "files_uploaded": files_up,
            "files_pending": files_pending,
            "bytes_uploaded": files_up * 1_280_000,
            "queue_depth": files_pending,
            "last_upload_ok": True,
            "latest_upload_ts": instant_to_utc_iso(instant),
        },
        "battery": {
            "pack_v": round(12.62 - 0.35 * day_progress + rng.uniform(-0.02, 0.02), 2),
            "soc_pct": round(91 - 8 * day_progress + rng.uniform(-0.6, 0.6), 1),
        },
        "environment": {
            "water_temp_c": round(water, 2),
            "enclosure_temp_c": round(21.5 + rng.uniform(0, 4), 1),
            "enclosure_rh_pct": round(58 + rng.uniform(0, 14), 1),
            "pressure_hpa": round(1013 + rng.uniform(-4, 4), 1),
        },
        "acoustic_display": {
            "leq_display_db": round(leq, 1),
            "leq_relative_db": round(leq, 1),
            "peak_display_db": round(leq + 12 + rng.uniform(0, 8), 1),
            "rms_dbfs": round(rms, 1),
            "peak_dbfs": round(rms + 26 + rng.uniform(0, 10), 1),
            "dominant_band": "broadband",
            "event_count_24h": events + tick % 6,
            "recording_effort_pct": round(85 + rng.uniform(0, 12), 1),
            "calibration_status": am.get("calibration_status", "uncalibrated"),
            "gain_warning": bool(am.get("gain_warning", True)),
            "calibration_note": am.get("calibration_note", ""),
            "hydrophone_gain_note": am.get("hydrophone_gain_note", ""),
        },
        "wave": {
            "hs_m": round(wave_hs, 2),
            "tp_s": round(3.2 + motion + rng.uniform(0, 1.2), 2),
            "current_mps": round(0.06 + motion * 0.1 + rng.uniform(0, 0.08), 3),
            "motion_index": round(motion, 2),
        },
        "imu_inferred": {
            "accel_rms_mps2": round(0.02 + motion * 0.15 + rng.uniform(0, 0.05), 4),
            "notes": "Inferred replay — no measured Brighton IMU",
        },
        "files_index": files_index(instant, phase.key, tick),
        "alerts": alerts_for_instant(instant, tick, phase.key),
        "weather_source": (weather or {}).get("weather_source", "fallback_inferred"),
    }
    return state


def provenance_dict(cfg: dict[str, Any], replay: dict[str, Any]) -> dict[str, Any]:
    measured = cfg.get("measured") or {}
    measured_fields = []
    if measured.get("water_temp_c") is not None:
        measured_fields.append("env.water_temp_c")
    if measured.get("deployment_start"):
        measured_fields.append("deployment_start")
    notes = cfg.get("notes") or {}
    return {
        "source": "brighton_marina_2026_05_01_replay",
        "test_date": str(cfg.get("test_date", TEST_DATE)),
        "measured_fields": measured_fields,
        "derived_fields": ["display_metrics.leq_relative_db"],
        "inferred_fields": [
            "telemetry.imu",
            "telemetry.gps.drift",
            "wave_stats",
            "environment.enclosure_temp_c",
            "environment.enclosure_rh_pct",
            "environment.pressure_hpa",
        ],
        "replay_fields": [
            "replay.tick",
            "replay.phase_id",
            "replay.test_time_local",
            "replay.upload",
            "replay.files_index",
            "replay.alerts",
        ],
        "notes": notes,
    }


def build_report_summary(cfg: dict[str, Any], replay: dict[str, Any]) -> dict[str, Any]:
    phases = parse_phases(cfg)
    return {
        "title": "Brighton Marina Field Test Replay Summary",
        "test_date": cfg.get("test_date", TEST_DATE),
        "node_id": cfg.get("node_id", "ucl-buoy"),
        "display_name": cfg.get("display_name", "Brighton Marina Field Test"),
        "coordinates": {
            "test_point": {"lat": TEST_POINT[0], "lon": TEST_POINT[1]},
            "marina_reference": {"lat": MARINA_REF[0], "lon": MARINA_REF[1]},
        },
        "phases": [
            {
                "id": p.key,
                "label": p.label,
                "start_local": format_local_bst(p.start),
                "end_local": format_local_bst(p.end),
                "description": p.description,
            }
            for p in phases
        ],
        "current_replay": {
            "phase_id": replay.get("phase_id"),
            "test_time_local": replay.get("test_time_local"),
            "test_time_utc": replay.get("test_time_utc"),
            "location": replay.get("location"),
            "provenance": provenance_dict(cfg, replay),
        },
        "measured": cfg.get("measured"),
    }


def load_weather_cache(path: Path | None) -> dict[str, Any] | None:
    if path is None or not path.is_file():
        return None
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def fetch_weather_cache(path: Path, lat: float, lon: float) -> dict[str, Any]:
    try:
        url = (
            "https://archive-api.open-meteo.com/v1/archive?"
            f"latitude={lat}&longitude={lon}&start_date=2026-05-01&end_date=2026-05-01"
            "&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m"
        )
        with urlopen(url, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        cache = {"weather_source": "open_meteo_historical", "hourly": data.get("hourly") or {}}
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
        return cache
    except Exception as exc:
        return {"weather_source": "fallback_inferred", "error": str(exc), "wave_height_m": 0.32}


# Back-compat aliases
def replay_instant(tick: int, interval_s: float, replay_duration_s: float) -> datetime:
    return parse_replay_instant(None, tick=tick, interval_s=interval_s)


def build_replay_state_legacy(cfg, tick, interval_s, replay_duration_s, weather=None):
    return build_replay_state(cfg, tick=tick, interval_s=interval_s, weather=weather)
