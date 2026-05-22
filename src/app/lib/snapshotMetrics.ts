import type { LatestSnapshots } from "../api/client";

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

export function getHealthStatus(snap: LatestSnapshots | null): string | null {
  return str(asRecord(snap?.health)?.status);
}

export function getHealthTs(snap: LatestSnapshots | null): string | null {
  return str(asRecord(snap?.health)?.ts);
}

export function getHealthPi(snap: LatestSnapshots | null): Record<string, unknown> | null {
  return asRecord(asRecord(snap?.health)?.pi);
}

export function getStorageMountOk(snap: LatestSnapshots | null): boolean | null {
  const storage = asRecord(asRecord(snap?.health)?.storage);
  if (!storage || !("mount_ok" in storage)) return null;
  return Boolean(storage.mount_ok);
}

export function getWaterTempC(snap: LatestSnapshots | null): number | null {
  return num(asRecord(snap?.env)?.water_temp_c);
}

export function getBatteryPackV(snap: LatestSnapshots | null): number | null {
  const tel = asRecord(snap?.telemetry);
  const battery = asRecord(tel?.battery);
  return num(battery?.pack_v ?? tel?.pack_v);
}

export function getBatterySocPct(snap: LatestSnapshots | null): number | null {
  const battery = asRecord(asRecord(snap?.telemetry)?.battery);
  return num(battery?.soc_pct);
}

export function getDisplayMetrics(snap: LatestSnapshots | null): Record<string, unknown> | null {
  return asRecord(asRecord(snap?.acoustics)?.display_metrics);
}

export function getLeqDb(snap: LatestSnapshots | null): number | null {
  return num(getDisplayMetrics(snap)?.leq_db);
}

export function getPeakDb(snap: LatestSnapshots | null): number | null {
  return num(getDisplayMetrics(snap)?.peak_db);
}

export function formatMetric(value: number | null, digits = 1, fallback = "—"): string {
  return value === null ? fallback : value.toFixed(digits);
}
