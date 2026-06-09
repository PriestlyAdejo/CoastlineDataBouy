function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isNoLiveEnv(env: unknown): boolean {
  const row = asRecord(env);
  return row?.status === "no_live_environment_sensor";
}

export function isNoLiveWave(wave: unknown): boolean {
  const row = asRecord(wave);
  return row?.status === "no_live_wave_sensor";
}

export function liveWaterTempC(env: unknown): number | null {
  if (isNoLiveEnv(env)) return null;
  const value = asRecord(env)?.water_temp_c;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function liveWaveHeightM(wave: unknown): number | null {
  if (isNoLiveWave(wave)) return null;
  const value = asRecord(wave)?.hs_m;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
