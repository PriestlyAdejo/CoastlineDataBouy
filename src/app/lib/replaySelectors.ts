import type { LatestSnapshots } from "../api/client";
import { BRIGHTON_MARINA_REF, BRIGHTON_TEST_POINT } from "./mapConfig";
import { formatBstLabel, parseReplayMs, TEST_DAY_START } from "./brightonPhases";
import type { DeploymentViewModel } from "./deploymentViewModel";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function replayBlock(snap: LatestSnapshots | null): Record<string, unknown> | null {
  const tel = asRecord(snap?.telemetry);
  return asRecord(tel?.replay) ?? asRecord(asRecord(snap?.health)?.replay);
}

export type TrackPoint = { t: number; lat: number; lon: number; label?: string };

export function selectTrackFromHistory(history: LatestSnapshots[]): TrackPoint[] {
  const out: TrackPoint[] = [];
  const seen = new Set<string>();
  for (const snap of history) {
    const gps = asRecord(asRecord(snap.telemetry)?.gps);
    const lat = typeof gps?.lat === "number" ? gps.lat : null;
    const lon = typeof gps?.lon === "number" ? gps.lon : null;
    const ts = snap.ts ?? "";
    if (lat == null || lon == null || seen.has(ts)) continue;
    seen.add(ts);
    out.push({ t: new Date(ts).getTime(), lat, lon });
  }
  if (out.length === 0) {
    out.push({ t: Date.now(), lat: BRIGHTON_TEST_POINT[0], lon: BRIGHTON_TEST_POINT[1] });
  }
  return out;
}

const STORAGE_TOTAL_GB = 2000;

export function selectStorageFromSnapshot(snap: LatestSnapshots | null, tick: number) {
  const health = asRecord(snap?.health);
  const storage = asRecord(health?.storage);
  const replay = replayBlock(snap);
  const files = (replay?.files_index as unknown[]) ?? [];
  let usedBytes = 0;
  for (const f of files) {
    const row = asRecord(f);
    if (row?.size_bytes != null) usedBytes += Number(row.size_bytes);
  }
  if (usedBytes === 0) usedBytes = 45e9 + tick * 50e6;
  const freeBytes = storage?.free_bytes != null ? Number(storage.free_bytes) : Math.max(0, STORAGE_TOTAL_GB * 1e9 - usedBytes);
  const totalBytes = storage?.total_bytes != null ? Number(storage.total_bytes) : STORAGE_TOTAL_GB * 1e9;
  const used = Math.min(totalBytes, Math.max(usedBytes, totalBytes - freeBytes));
  return {
    totalGb: totalBytes / 1e9,
    usedGb: used / 1e9,
    freeGb: (totalBytes - used) / 1e9,
    pct: (used / totalBytes) * 100,
    mountpoint: String(storage?.mountpoint ?? "/mnt/harddrive/buoy"),
  };
}

export function selectChartSeries(
  vm: DeploymentViewModel | null,
  kind: "water" | "pressure" | "cpu" | "battery" | "packet" | "overview",
): { label: string; value: number }[] {
  const dayStart = parseReplayMs(TEST_DAY_START);
  const now = vm?.replayTimeMs ?? dayStart;
  const points: { label: string; value: number }[] = [];
  const span = Math.max(now - dayStart, 1);
  const steps = kind === "overview" ? 24 : 48;
  for (let i = 0; i <= steps; i++) {
    const t = dayStart + (span * i) / steps;
    const label = formatBstLabel(t);
    let value = 0;
    if (kind === "water") value = 12 + Math.sin(i / 4) * 0.2;
    else if (kind === "pressure") value = 1013 + Math.sin(i / 6) * 3;
    else if (kind === "cpu") value = 18 + (vm?.health.cpuPct ?? 20) * 0.5 + Math.sin(i) * 4;
    else if (kind === "battery") value = 12.5 - (i / steps) * 0.25;
    else if (kind === "packet") value = t <= now ? 55 + Math.sin(i) * 5 : 0;
    else value = 0.3 + Math.sin(i / 3) * 0.15;
    points.push({ label, value: +value.toFixed(kind === "battery" ? 2 : 1) });
  }
  return points;
}

export type AcousticEventRow = {
  id: string;
  cls: string;
  time: string;
  confidence: number;
  level: string;
  reviewed: boolean;
};

export function selectAcousticEvents(vm: DeploymentViewModel | null): AcousticEventRow[] {
  if (!vm) return [];
  const phase = vm.phase.id;
  const base = vm.replayTimeMs;
  const rows: AcousticEventRow[] = [];
  const templates: Record<string, { cls: string; offsetMin: number; level: number }[]> = {
    anchored_disturbed: [
      { cls: "vessel", offsetMin: 0, level: 68 },
      { cls: "transient", offsetMin: 2, level: 72 },
      { cls: "wave", offsetMin: 5, level: 58 },
    ],
    free_floating: [
      { cls: "wave", offsetMin: 0, level: 55 },
      { cls: "transient", offsetMin: 8, level: 52 },
    ],
    anchored_quiet: [{ cls: "wave", offsetMin: 0, level: 48 }],
    on_boat_pre: [{ cls: "vessel", offsetMin: 0, level: 62 }],
    default: [{ cls: "unknown", offsetMin: 0, level: 50 }],
  };
  const list = templates[phase] ?? templates.default;
  list.forEach((e, i) => {
    const t = new Date(base - e.offsetMin * 60_000);
    rows.push({
      id: `EVT-${phase.slice(0, 3).toUpperCase()}-${i}`,
      cls: e.cls,
      time: formatBstLabel(t.getTime()) + " UTC",
      confidence: 0.75 + i * 0.05,
      level: `${e.level} dB rel.`,
      reviewed: i % 2 === 0,
    });
  });
  return rows;
}

export function selectTelemetryPackets(vm: DeploymentViewModel | null) {
  if (!vm) return [];
  const lat = vm.position.lat;
  const lon = vm.position.lon;
  return [
    { time: formatBstLabel(vm.replayTimeMs), lat: lat.toFixed(5), lon: lon.toFixed(5), status: "OK", rssi: -72, snr: 11.2 },
    { time: formatBstLabel(vm.replayTimeMs - 30_000), lat: (lat + 0.00002).toFixed(5), lon: (lon - 0.00001).toFixed(5), status: "OK", rssi: -74, snr: 10.8 },
    { time: formatBstLabel(vm.replayTimeMs - 60_000), lat: (lat - 0.00001).toFixed(5), lon: (lon + 0.00002).toFixed(5), status: "OK", rssi: -71, snr: 11.5 },
  ];
}

export { BRIGHTON_MARINA_REF, BRIGHTON_TEST_POINT };
