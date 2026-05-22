import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createApiClient, type LatestSnapshots } from "../api/client";
import { isBrightonDemo } from "../lib/demoMode";
import {
  getAcousticMetrics,
  getAlertRows,
  getEnvironmentMetrics,
  getFileRows,
  getHealthMetrics,
  getHydrophoneCharts,
  getLocationMetrics,
  getMapConfig,
  getReportSummaryState,
  getSidebarStatus,
  getTelemetryMetrics,
  getTopbarStatus,
  getWaveMetrics,
  type AlertRow,
  type FileRow,
} from "../lib/brightonReplay";
import { buildLocalSnapshot } from "../lib/brightonReplayEngine";
import type { BrightonPhaseDef } from "../lib/brightonPhases";
import {
  getCurrentPhase,
  getCurrentReplayTimeMs,
  jumpToPhase,
  loadReplayClock,
  pauseReplay,
  persistReplayClock,
  resetReplayToStart,
  resumeReplay,
  setReplaySpeed,
  setReplayTimeMs,
  tickReplayClock,
  type ReplayClockState,
} from "../lib/replayClock";
import type { MapConfig } from "../lib/mapConfig";

const POLL_MS = 3000;
const HISTORY_MAX = 120;
const TICK_MS = 500;

export type BrightonReplayContextValue = {
  clock: ReplayClockState;
  snapshots: LatestSnapshots | null;
  apiSnapshots: LatestSnapshots | null;
  history: LatestSnapshots[];
  loading: boolean;
  error: string | null;
  tick: number;
  useApiPrimary: boolean;
  getCurrentReplayTime: () => number;
  getCurrentPhase: () => BrightonPhaseDef;
  setReplayTime: (isoOrMs: string | number) => void;
  jumpToPhase: (phaseId: string) => void;
  pauseReplay: () => void;
  resumeReplay: () => void;
  setReplaySpeed: (speed: number) => void;
  resetToTestStart: () => void;
  getReplaySnapshot: () => LatestSnapshots | null;
  getTelemetryMetrics: () => ReturnType<typeof getTelemetryMetrics>;
  getHealthMetrics: () => ReturnType<typeof getHealthMetrics>;
  getEnvironmentMetrics: () => ReturnType<typeof getEnvironmentMetrics>;
  getAcousticMetrics: () => ReturnType<typeof getAcousticMetrics>;
  getWaveMetrics: () => ReturnType<typeof getWaveMetrics>;
  getLocationMetrics: () => ReturnType<typeof getLocationMetrics>;
  getFileRows: () => FileRow[];
  getAlertRows: () => AlertRow[];
  getHydrophoneCharts: () => ReturnType<typeof getHydrophoneCharts>;
  getSidebarStatus: () => ReturnType<typeof getSidebarStatus>;
  getTopbarStatus: () => ReturnType<typeof getTopbarStatus>;
  getMapConfig: () => MapConfig;
  getReportSummaryState: () => ReturnType<typeof getReportSummaryState>;
};

const BrightonReplayContext = createContext<BrightonReplayContextValue | null>(null);

function mergeSnapshots(api: LatestSnapshots | null, local: LatestSnapshots, preferApi: boolean): LatestSnapshots {
  if (!preferApi || !api) return local;
  const apiReplay = (api.telemetry as Record<string, unknown> | null)?.replay;
  if (!apiReplay) return local;
  return api;
}

export function BrightonReplayProvider({ children }: { children: ReactNode }) {
  const enabled = isBrightonDemo();
  const [clock, setClock] = useState<ReplayClockState>(() => loadReplayClock());
  const [tick, setTick] = useState(0);
  const [apiSnapshots, setApiSnapshots] = useState<LatestSnapshots | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LatestSnapshots[]>([]);
  const lastPoll = useRef(0);

  const localSnapshot = useMemo(
    () => (enabled ? buildLocalSnapshot(getCurrentReplayTimeMs(clock), tick) : null),
    [enabled, clock, tick],
  );

  const useApiPrimary = Boolean(apiSnapshots?.ts && !error);
  const snapshots = useMemo(
    () => (localSnapshot ? mergeSnapshots(apiSnapshots, localSnapshot, useApiPrimary) : apiSnapshots),
    [apiSnapshots, localSnapshot, useApiPrimary],
  );

  const refreshApi = useCallback(async () => {
    if (!enabled) return;
    try {
      const client = createApiClient();
      const snap = await client.getLatestSnapshots("ucl-buoy");
      setApiSnapshots(snap);
      setError(null);
      lastPoll.current = Date.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setApiSnapshots(null);
      setHistory([]);
      setLoading(false);
      return;
    }
    refreshApi();
    const id = window.setInterval(refreshApi, POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, refreshApi]);

  useEffect(() => {
    if (!enabled || !snapshots) return;
    setHistory((prev) => [...prev.slice(-(HISTORY_MAX - 1)), snapshots]);
  }, [enabled, snapshots?.ts, tick, clock.replayTimeMs]);

  const clockRef = useRef(clock);
  clockRef.current = clock;

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      const c = clockRef.current;
      if (dt > 0 && !c.paused) {
        setClock((prev) => tickReplayClock(prev, dt));
        setTick((t) => t + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  const value = useMemo<BrightonReplayContextValue>(
    () => ({
      clock,
      snapshots,
      apiSnapshots,
      history,
      loading,
      error,
      tick,
      useApiPrimary,
      getCurrentReplayTime: () => getCurrentReplayTimeMs(clock),
      getCurrentPhase: () => getCurrentPhase(clock),
      setReplayTime: (isoOrMs) => {
        const ms = typeof isoOrMs === "number" ? isoOrMs : new Date(isoOrMs).getTime();
        setClock((c) => setReplayTimeMs(c, ms));
        setTick((t) => t + 1);
      },
      jumpToPhase: (phaseId) => {
        setClock((c) => jumpToPhase(c, phaseId));
        setTick((t) => t + 1);
      },
      pauseReplay: () => setClock((c) => pauseReplay(c)),
      resumeReplay: () => setClock((c) => resumeReplay(c)),
      setReplaySpeed: (speed) => setClock((c) => setReplaySpeed(c, speed)),
      resetToTestStart: () => {
        setClock(resetReplayToStart());
        setTick((t) => t + 1);
      },
      getReplaySnapshot: () => snapshots,
      getTelemetryMetrics: () => getTelemetryMetrics(snapshots),
      getHealthMetrics: () => getHealthMetrics(snapshots),
      getEnvironmentMetrics: () => getEnvironmentMetrics(snapshots),
      getAcousticMetrics: () => getAcousticMetrics(snapshots),
      getWaveMetrics: () => getWaveMetrics(snapshots),
      getLocationMetrics: () => getLocationMetrics(snapshots),
      getFileRows: () => getFileRows(snapshots),
      getAlertRows: () => getAlertRows(snapshots),
      getHydrophoneCharts: () => getHydrophoneCharts(history.length ? history : snapshots ? [snapshots] : []),
      getSidebarStatus: () => getSidebarStatus(snapshots, clock),
      getTopbarStatus: () => getTopbarStatus(snapshots, clock),
      getMapConfig: () => getMapConfig(),
      getReportSummaryState: () => getReportSummaryState(snapshots, clock),
    }),
    [clock, snapshots, apiSnapshots, history, loading, error, tick, useApiPrimary],
  );

  return <BrightonReplayContext.Provider value={value}>{children}</BrightonReplayContext.Provider>;
}

export function useBrightonReplay(): BrightonReplayContextValue | null {
  return useContext(BrightonReplayContext);
}

export function useBrightonReplayRequired(): BrightonReplayContextValue {
  const ctx = useContext(BrightonReplayContext);
  if (!ctx) throw new Error("useBrightonReplayRequired outside BrightonReplayProvider");
  return ctx;
}
