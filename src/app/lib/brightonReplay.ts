import type { LatestSnapshots } from "../api/client";
import { formatBstDateTime, formatBstLabel, phaseAtTime } from "./brightonPhases";
import { getCurrentReplayTimeMs, type ReplayClockState } from "./replayClock";
import { getActiveMapConfig, type MapConfig } from "./mapConfig";
import {
  formatMetric,
  getBatteryPackV,
  getBatterySocPct,
  getDisplayMetrics,
  getHealthPi,
  getHealthStatus,
  getLeqDb,
  getPeakDb,
  getStorageMountOk,
  getWaterTempC,
} from "./snapshotMetrics";
import { formatSplDisplay, isCalibratedSpl } from "./acousticDisplay";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function getReplayBlock(snap: LatestSnapshots | null): Record<string, unknown> | null {
  const tel = asRecord(snap?.telemetry);
  return asRecord(tel?.replay) ?? asRecord(asRecord(snap?.health)?.replay) ?? asRecord(asRecord(snap?.env)?.replay);
}

export function getTestTimeLabel(snap: LatestSnapshots | null, clock?: ReplayClockState): string {
  const replay = getReplayBlock(snap);
  const local = str(replay?.test_time_local);
  if (local) {
    try {
      return formatBstDateTime(new Date(local).getTime());
    } catch {
      return local;
    }
  }
  if (clock) return formatBstDateTime(getCurrentReplayTimeMs(clock));
  return "1 May 2026";
}

export type TelemetryMetrics = {
  seq: number | null;
  packV: string;
  socPct: string;
  phaseKey: string;
  phaseLabel: string;
  uploadRate: string;
  filesUploaded: number | null;
  filesPending: number | null;
};

export function getTelemetryMetrics(snap: LatestSnapshots | null): TelemetryMetrics {
  const replay = getReplayBlock(snap);
  const upload = asRecord(replay?.upload);
  const tel = asRecord(snap?.telemetry);
  return {
    seq: num(tel?.seq) ?? num(replay?.seq),
    packV: formatMetric(getBatteryPackV(snap), 2, "—") + (getBatteryPackV(snap) !== null ? " V" : ""),
    socPct: formatMetric(getBatterySocPct(snap), 0, "—") + (getBatterySocPct(snap) !== null ? "%" : ""),
    phaseKey: str(replay?.phase_id) ?? str(replay?.phase_key) ?? "—",
    phaseLabel: str(replay?.phase_label) ?? "—",
    uploadRate: upload?.packet_delivery_rate != null ? `${(Number(upload.packet_delivery_rate) * 100).toFixed(1)}%` : "—",
    filesUploaded: num(upload?.files_uploaded),
    filesPending: num(upload?.files_pending),
  };
}

export function getHealthMetrics(snap: LatestSnapshots | null) {
  const pi = getHealthPi(snap);
  const replay = getReplayBlock(snap);
  const storage = asRecord(asRecord(snap?.health)?.storage);
  return {
    status: getHealthStatus(snap) ?? "unknown",
    cpuPct: formatMetric(num(pi?.cpu_pct), 1, "—"),
    memPct: formatMetric(num(pi?.mem_pct), 1, "—"),
    cpuTempC: formatMetric(num(pi?.cpu_temp_c), 1, "—"),
    mountOk: getStorageMountOk(snap),
    mountpoint: str(storage?.mountpoint) ?? "/mnt/harddrive/buoy",
    freeGb: storage?.free_bytes != null ? (Number(storage.free_bytes) / 1e9).toFixed(1) : "—",
    phaseLabel: str(replay?.phase_label) ?? "—",
  };
}

export function getEnvironmentMetrics(snap: LatestSnapshots | null) {
  const env = asRecord(snap?.env);
  const replayEnv = asRecord(getReplayBlock(snap)?.environment);
  return {
    waterTempC: formatMetric(getWaterTempC(snap) ?? num(replayEnv?.water_temp_c), 1, "—"),
    enclosureTempC: formatMetric(num(env?.enclosure_temp_c) ?? num(replayEnv?.enclosure_temp_c), 1, "—"),
    enclosureRhPct: formatMetric(num(env?.enclosure_rh_pct) ?? num(replayEnv?.enclosure_rh_pct), 0, "—"),
    pressureHpa: formatMetric(num(env?.pressure_hpa) ?? num(replayEnv?.pressure_hpa), 0, "—"),
  };
}

export function getAcousticMetrics(snap: LatestSnapshots | null) {
  const dm = getDisplayMetrics(snap);
  const replayAc = asRecord(getReplayBlock(snap)?.acoustic_display);
  const cal = str(dm?.calibration_status) ?? str(replayAc?.calibration_status) ?? "uncalibrated";
  const leq = getLeqDb(snap) ?? num(replayAc?.leq_display_db);
  const peak = getPeakDb(snap) ?? num(replayAc?.peak_display_db);
  return {
    leqDisplay: formatSplDisplay(leq, cal, { replayLabel: "replay est." }),
    peakDisplay: formatSplDisplay(peak, cal, { replayLabel: "replay est." }),
    calibrationStatus: cal,
    isCalibrated: isCalibratedSpl(cal),
    gainNote: str(replayAc?.hydrophone_gain_note) ?? "Hydrophone gain uncalibrated for Brighton test.",
    eventCount24h: num(replayAc?.event_count_24h),
    recordingEffortPct: num(replayAc?.recording_effort_pct),
  };
}

export function getWaveMetrics(snap: LatestSnapshots | null) {
  const ws = asRecord(snap?.wave_stats);
  const replayWave = asRecord(getReplayBlock(snap)?.wave);
  return {
    hsM: formatMetric(num(ws?.hs_m) ?? num(replayWave?.hs_m), 2, "—"),
    tpS: formatMetric(num(ws?.tp_s) ?? num(replayWave?.tp_s), 1, "—"),
    currentMps: formatMetric(num(replayWave?.current_mps), 2, "—"),
    qualityNote: str(asRecord(ws?.quality)?.notes) ?? "Inferred replay",
  };
}

export function getLocationMetrics(snap: LatestSnapshots | null) {
  const replay = getReplayBlock(snap);
  const loc = asRecord(replay?.location);
  const gps = asRecord(asRecord(snap?.telemetry)?.gps) ?? asRecord(replay?.gps);
  const lat = num(loc?.lat) ?? num(gps?.lat);
  const lon = num(loc?.lon) ?? num(gps?.lon);
  return {
    lat,
    lon,
    phaseKey: str(replay?.phase_id) ?? str(replay?.phase_key) ?? str(gps?.phase_key),
    phaseLabel: str(replay?.phase_label) ?? str(gps?.phase_label),
    driftM24h: num(loc?.drift_m_24h),
    anchorState: str(loc?.anchor_state),
    uncertaintyRadiusM: num(loc?.uncertainty_radius_m) ?? 50,
    marinaRef: asRecord(loc?.marina_reference),
    testPoint: asRecord(loc?.test_point),
    satellites: num(gps?.satellites),
    hdop: num(gps?.hdop),
    fix: str(gps?.fix),
  };
}

export type FileRow = {
  name: string;
  size: string;
  category: string;
  date: string;
  provenance: string;
  uploadStatus: string;
};

export function getFileRows(snap: LatestSnapshots | null): FileRow[] {
  const replay = getReplayBlock(snap);
  const index = (replay?.files_index as unknown[]) ?? [];
  return index.map((raw) => {
    const f = asRecord(raw) ?? {};
    const bytes = num(f.size_bytes);
    return {
      name: str(f.name) ?? "unknown",
      size: bytes != null ? `${(bytes / 1e6).toFixed(2)} MB` : "—",
      category: str(f.category) ?? "system",
      date: str(f.date) ?? "1 May 2026",
      provenance: str(f.provenance) ?? "replay",
      uploadStatus: str(f.upload_status) ?? "indexed",
    };
  });
}

export type AlertRow = {
  id: string;
  title: string;
  description: string;
  severity: string;
  source: string;
  time: string;
  acknowledged: boolean;
};

export function getAlertRows(snap: LatestSnapshots | null): AlertRow[] {
  const replay = getReplayBlock(snap);
  const alerts = (replay?.alerts as unknown[]) ?? [];
  return alerts.map((raw) => {
    const a = asRecord(raw) ?? {};
    return {
      id: str(a.id) ?? "alert",
      title: str(a.title) ?? "Alert",
      description: str(a.description) ?? "",
      severity: str(a.severity) ?? "info",
      source: str(a.source) ?? "System",
      time: str(a.time) ?? "1 May 2026",
      acknowledged: Boolean(a.acknowledged),
    };
  });
}

export function getHydrophoneCharts(history: LatestSnapshots[]): { time: string; leq: number; peak: number }[] {
  return history.map((snap, i) => {
    const m = getAcousticMetrics(snap);
    const dm = getDisplayMetrics(snap);
    return {
      time: `${String(i).padStart(2, "0")}:${String((i * 3) % 60).padStart(2, "0")}`,
      leq: num(dm?.leq_db) ?? 54 + i * 0.2,
      peak: num(dm?.peak_db) ?? 68 + i * 0.3,
    };
  });
}

export function getSidebarStatus(snap: LatestSnapshots | null, clock?: ReplayClockState) {
  const health = getHealthMetrics(snap);
  const env = getEnvironmentMetrics(snap);
  const tel = getTelemetryMetrics(snap);
  const phase = clock ? phaseAtTime(getCurrentReplayTimeMs(clock)).label : tel.phaseLabel;
  return {
    battery: tel.socPct !== "—" ? tel.socPct : tel.packV,
    temp: env.waterTempC !== "—" ? `${env.waterTempC}°C` : "—",
    depth: "—",
    status: health.status === "ok" ? "Active" : "Maintenance",
    phase,
    testTime: getTestTimeLabel(snap, clock),
  };
}

export function getTopbarStatus(snap: LatestSnapshots | null, clock?: ReplayClockState) {
  const tel = getTelemetryMetrics(snap);
  return {
    testTimeLabel: getTestTimeLabel(snap, clock),
    phaseLabel: tel.phaseLabel,
    phaseKey: tel.phaseKey,
    lastSync: clock?.paused ? "paused" : "live replay",
    apiTs: snap?.ts ?? null,
  };
}

export function getReportSummaryState(snap: LatestSnapshots | null, clock?: ReplayClockState) {
  const replay = getReplayBlock(snap);
  const loc = getLocationMetrics(snap);
  return {
    test_date: "2026-05-01",
    node_id: "ucl-buoy",
    phase_id: str(replay?.phase_id) ?? str(replay?.phase_key),
    test_time_local: str(replay?.test_time_local) ?? (clock ? formatBstDateTime(getCurrentReplayTimeMs(clock)) : null),
    test_time_utc: str(replay?.test_time_utc) ?? snap?.ts,
    location: loc,
    provenance: asRecord(snap?.telemetry)?.provenance ?? asRecord(snap?.health)?.provenance,
  };
}

export function getMapConfig(): MapConfig {
  return getActiveMapConfig();
}

export function formatPositionLabel(lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) return "—";
  const latH = lat >= 0 ? "N" : "S";
  const lonH = lon <= 0 ? "W" : "E";
  return `${Math.abs(lat).toFixed(5)}°${latH}, ${Math.abs(lon).toFixed(5)}°${lonH}`;
}
