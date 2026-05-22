/**
 * Client-side mirror of scripts/brighton_replay_engine.py for instant UI updates
 * when the replay clock jumps (before/with API seeder).
 */
import type { LatestSnapshots } from "../api/client";
import { BRIGHTON_MARINA_REF, BRIGHTON_TEST_POINT } from "./mapConfig";
import { BRIGHTON_PHASES, formatBstDateTime, formatBstLabel, parseReplayMs, phaseAtTime } from "./brightonPhases";

const MARINA = BRIGHTON_MARINA_REF;
const TEST = BRIGHTON_TEST_POINT;

function seededRand(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return (h % 10000) / 10000;
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function offsetM(lat: number, lon: number, eastM: number, northM: number): [number, number] {
  const dlat = northM / 111320;
  const dlon = eastM / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lat + dlat, lon + dlon];
}

function phaseProgress(phaseId: string, ms: number): number {
  const p = BRIGHTON_PHASES.find((x) => x.id === phaseId);
  if (!p) return 0.5;
  const s = parseReplayMs(p.start);
  const e = parseReplayMs(p.end);
  return Math.max(0, Math.min(1, (ms - s) / Math.max(e - s, 1)));
}

function locationForPhase(phaseId: string, ms: number, rnd: () => number) {
  const [mLat, mLon] = MARINA;
  const [tLat, tLon] = TEST;
  let lat = tLat;
  let lon = tLon;
  let anchor = "unknown";
  let drift24 = 0;
  let sog = 0;
  let driftAnchor = 0;

  if (phaseId === "pre_record" || phaseId === "after_test") {
    [lat, lon] = [mLat, mLon];
    anchor = "dock";
  } else if (phaseId === "on_land") {
    [lat, lon] = [mLat, mLon];
    anchor = "land";
  } else if (phaseId === "on_boat_pre") {
    const t = 0.2 + 0.7 * phaseProgress(phaseId, ms);
    lat = lerp(mLat, tLat, t);
    lon = lerp(mLon, tLon, t);
    anchor = "transit";
    drift24 = 0.1 + rnd() * 0.4;
    sog = 0.3 + rnd() * 0.9;
    driftAnchor = 5 + rnd() * 20;
  } else if (phaseId === "free_floating") {
    [lat, lon] = offsetM(tLat, tLon, (rnd() - 0.5) * 70, (rnd() - 0.5) * 70);
    anchor = "drifting";
    drift24 = 3 + rnd() * 9;
    sog = 0.1 + rnd() * 0.5;
    driftAnchor = 15 + rnd() * 30;
  } else if (phaseId === "on_boat_mid") {
    [lat, lon] = offsetM(tLat, tLon, (rnd() - 0.5) * 24, (rnd() - 0.5) * 24);
    anchor = "transit";
    drift24 = 0.5 + rnd() * 2;
    sog = 0.2 + rnd() * 0.7;
  } else if (phaseId === "anchored_quiet") {
    [lat, lon] = offsetM(tLat, tLon, (rnd() - 0.5) * 8, (rnd() - 0.5) * 8);
    anchor = "moored";
    drift24 = 0.05 + rnd() * 0.35;
    sog = rnd() * 0.12;
    driftAnchor = 0.5 + rnd() * 2.5;
  } else if (phaseId === "anchored_disturbed") {
    [lat, lon] = offsetM(tLat, tLon, (rnd() - 0.5) * 20, (rnd() - 0.5) * 20);
    anchor = "moored_disturbed";
    drift24 = 0.4 + rnd() * 1.4;
    sog = 0.05 + rnd() * 0.3;
    driftAnchor = 2 + rnd() * 10;
  } else if (phaseId === "post_test") {
    const t = phaseProgress(phaseId, ms);
    lat = lerp(tLat, mLat, t);
    lon = lerp(tLon, mLon, t);
    anchor = "transit";
    drift24 = 0.2 + rnd();
    sog = 0.2 + rnd() * 0.7;
  }

  return {
    lat: +lat.toFixed(6),
    lon: +lon.toFixed(6),
    uncertainty_radius_m: 50,
    position_source: "inferred_replay",
    anchor_state: anchor,
    anchor_status: anchor,
    drift_m_24h: +drift24.toFixed(2),
    drift_m_24h_est: +drift24.toFixed(2),
    drift_from_anchor_m: +driftAnchor.toFixed(1),
    speed_over_ground_mps: +sog.toFixed(3),
    marina_reference: { lat: mLat, lon: mLon },
    test_point: { lat: tLat, lon: tLon },
  };
}

const ACOUSTIC: Record<string, [number, number, number, number]> = {
  pre_record: [48, -62, 0, 0.3],
  on_land: [50, -60, 1, 0.4],
  on_boat_pre: [58, -50, 5, 0.8],
  free_floating: [55, -52, 4, 0.6],
  on_boat_mid: [57, -51, 4, 0.7],
  anchored_quiet: [52, -58, 2, 0.2],
  anchored_disturbed: [65, -44, 12, 1.2],
  post_test: [56, -51, 4, 0.5],
  after_test: [49, -61, 1, 0.25],
};

export function buildLocalReplayState(replayTimeMs: number, tick: number) {
  const phase = phaseAtTime(replayTimeMs);
  const rnd = seededRand(`${replayTimeMs}:${tick}:${phase.id}`);
  const dayStart = parseReplayMs("2026-05-01T00:00:00+01:00");
  const dayEnd = parseReplayMs("2026-05-01T23:59:59+01:00");
  const progress = (replayTimeMs - dayStart) / Math.max(dayEnd - dayStart, 1);
  const loc = locationForPhase(phase.id, replayTimeMs, rnd);
  const [leq0, rms0, events0, motion0] = ACOUSTIC[phase.id] ?? [54, -55, 3, 0.4];
  const leq = leq0 + (rnd() - 0.5) * 3;
  const rms = rms0 + (rnd() - 0.5) * 2;
  const filesUp = 6 + Math.floor(progress * 40) + tick;
  const filesPending = Math.max(0, 4 - Math.floor(tick / 6));
  const utc = new Date(replayTimeMs).toISOString();
  const local = new Date(replayTimeMs).toLocaleString("sv-SE", { timeZone: "Europe/London" }).replace(" ", "T") + "+01:00";

  const replay = {
    mode: "brighton-marina-2026-05-01",
    tick,
    seq: tick,
    test_date: "2026-05-01",
    test_time_local: local,
    test_time_utc: utc,
    phase_id: phase.id,
    phase_key: phase.id,
    phase_label: phase.label,
    phase_color: phase.colour,
    is_replay: true,
    paused: false,
    location: loc,
    gps: { ...loc, fix: "3D", satellites: 6 + Math.floor(rnd() * 4), hdop: +(0.6 + rnd() * 0.9).toFixed(1), phase_label: phase.label, phase_key: phase.id },
    upload: {
      backend_reachable: true,
      packet_delivery_rate: 0.98 + rnd() * 0.02,
      files_uploaded: filesUp,
      files_pending: filesPending,
      files_seen: filesUp + filesPending,
      queue_depth: filesPending,
      latest_upload_ts: utc,
    },
    battery: { pack_v: +(12.62 - 0.35 * progress + (rnd() - 0.5) * 0.04).toFixed(2), soc_pct: +(91 - 8 * progress).toFixed(1) },
    environment: {
      water_temp_c: +Math.max(11.8, Math.min(12.3, 12 + (rnd() - 0.5) * 0.4)).toFixed(2),
      enclosure_temp_c: +(21.5 + rnd() * 4).toFixed(1),
      enclosure_rh_pct: +(58 + rnd() * 14).toFixed(1),
      pressure_hpa: +(1013 + (rnd() - 0.5) * 8).toFixed(1),
    },
    acoustic_display: {
      leq_display_db: +leq.toFixed(1),
      leq_relative_db: +leq.toFixed(1),
      peak_display_db: +(leq + 12 + rnd() * 8).toFixed(1),
      rms_dbfs: +rms.toFixed(1),
      peak_dbfs: +(rms + 26 + rnd() * 8).toFixed(1),
      calibration_status: "uncalibrated",
      gain_warning: true,
      event_count_24h: events0 + (tick % 6),
      recording_effort_pct: +(85 + rnd() * 12).toFixed(1),
    },
    wave: { hs_m: +(0.22 + motion0 * 0.15).toFixed(2), tp_s: +(3.2 + motion0).toFixed(2), current_mps: +(0.06 + motion0 * 0.1).toFixed(3) },
    files_index: [
      { name: `brighton_marina_hydrophone_2026-05-01_${formatBstLabel(replayTimeMs).replace(":", "")}.wav`, category: "audio", size_bytes: tick * 12000, date: "1 May 2026", provenance: "replay_metadata_only", upload_status: tick < 3 ? "pending" : "uploaded" },
      { name: "brighton_marina_field_notes_2026-05-01.json", category: "sensor", size_bytes: 8400, date: "1 May 2026", provenance: "replay_metadata_only", upload_status: "uploaded" },
      { name: "brighton_marina_replay_summary_2026-05-01.json", category: "system", size_bytes: 12000, date: "1 May 2026", provenance: "replay_export", upload_status: "uploaded" },
    ],
    alerts: [
      { id: "BR-GAIN-001", title: "Hydrophone gain uncalibrated", description: "Replay/relative acoustic levels only.", severity: "warning", source: "Acoustic", time: formatBstLabel(replayTimeMs), acknowledged: false },
      ...(phase.id === "anchored_disturbed" ? [{ id: "BR-VESSEL", title: "Vessel disturbance detected", description: "Boat circling buoy phase.", severity: "warning", source: "Acoustic", time: formatBstLabel(replayTimeMs), acknowledged: false }] : []),
    ],
    phase: { phase_id: phase.id, phase_label: phase.label, description: phase.description },
  };

  return { replay, phase, utc, local, displayLabel: formatBstDateTime(replayTimeMs) };
}

export function buildLocalSnapshot(replayTimeMs: number, tick: number): LatestSnapshots {
  const { replay, utc } = buildLocalReplayState(replayTimeMs, tick);
  const prov = {
    source: "brighton_marina_2026_05_01_replay",
    test_date: "2026-05-01",
    measured_fields: ["env.water_temp_c"],
    inferred_fields: ["telemetry.imu", "wave_stats", "telemetry.gps"],
    replay_fields: ["replay.phase_id", "replay.test_time_local"],
  };

  return {
    node_id: "ucl-buoy",
    ts: utc,
    health: { ts: utc, status: "ok", storage: { mountpoint: "/mnt/harddrive/buoy", mount_ok: true, free_bytes: 9e11 }, replay, provenance: prov },
    env: { ts: utc, water_temp_c: replay.environment.water_temp_c, enclosure_temp_c: replay.environment.enclosure_temp_c, replay, provenance: prov },
    telemetry: {
      ts: utc,
      seq: tick,
      battery: replay.battery,
      pack_v: replay.battery.pack_v,
      gps: replay.gps,
      replay,
      provenance: prov,
    },
    acoustics: {
      ts: utc,
      display_metrics: {
        leq_db: replay.acoustic_display.leq_display_db,
        peak_db: replay.acoustic_display.peak_display_db,
        rms_dbfs: replay.acoustic_display.rms_dbfs,
        calibration_status: "uncalibrated",
      },
      replay,
      provenance: prov,
    },
    wave_stats: { ts: utc, hs_m: replay.wave.hs_m, tp_s: replay.wave.tp_s, replay, provenance: prov },
  };
}
