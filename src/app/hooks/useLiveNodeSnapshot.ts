import { useEffect, useMemo, useState } from "react";
import { createApiClient, getApiBaseUrl, type LatestSnapshots } from "../api/client";
import { isBrightonDemo } from "../lib/demoMode";

export type LiveModeLabel =
  | "LIVE API"
  | "BRIGHTON REPLAY"
  | "MOCK FALLBACK"
  | "API OFFLINE"
  | "STALE LIVE DATA";

/**
 * Poll latest node snapshots for handover live mode.
 */
export function useLiveNodeSnapshot(nodeId = "ucl-buoy") {
  const [snapshot, setSnapshot] = useState<LatestSnapshots | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateMs, setLastUpdateMs] = useState<number | null>(null);

  useEffect(() => {
    if (isBrightonDemo()) return;
    const client = createApiClient({ baseUrl: getApiBaseUrl() });
    let stopped = false;
    const tick = async () => {
      try {
        const s = await client.getLatestSnapshots(nodeId);
        if (stopped) return;
        setSnapshot(s);
        setError(null);
        setLastUpdateMs(Date.now());
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : String(e));
      }
    };
    void tick();
    const t = setInterval(() => void tick(), 2500);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [nodeId]);

  const stale = lastUpdateMs != null ? Date.now() - lastUpdateMs > 15_000 : false;
  const modeLabel: LiveModeLabel = isBrightonDemo()
    ? "BRIGHTON REPLAY"
    : error
      ? "API OFFLINE"
      : stale
        ? "STALE LIVE DATA"
        : snapshot
          ? "LIVE API"
          : "MOCK FALLBACK";

  return useMemo(
    () => ({
      snapshot,
      error,
      stale,
      modeLabel,
      apiBase: getApiBaseUrl(),
      lastUpdateIso: lastUpdateMs ? new Date(lastUpdateMs).toISOString() : null,
      telemetry: snapshot?.telemetry ?? null,
      env: snapshot?.env ?? null,
      health: snapshot?.health ?? null,
      acoustics: snapshot?.acoustics ?? null,
      wave_stats: snapshot?.wave_stats ?? null,
      gps:
        (snapshot?.telemetry as any)?.gps ??
        (snapshot?.env as any)?.gps ??
        null,
    }),
    [snapshot, error, stale, modeLabel, lastUpdateMs],
  );
}
