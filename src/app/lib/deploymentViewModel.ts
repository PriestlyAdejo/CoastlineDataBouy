import type { LatestSnapshots } from "../api/client";
import type { BrightonReplayContextValue } from "../components/BrightonReplayContext";
import {
  getAcousticMetrics,
  getAlertRows,
  getEnvironmentMetrics,
  getFileRows,
  getHealthMetrics,
  getLocationMetrics,
  getReplayBlock,
  getTelemetryMetrics,
  getTestTimeLabel,
  getWaveMetrics,
  type AlertRow,
  type FileRow,
} from "./brightonReplay";
import {
  acousticLevelLabel,
  acousticUnitLabel,
  syncStatusLabel,
} from "./deploymentDisplay";
import { getDeploymentMeta, isBrightonDemo } from "./demoMode";
import { getCurrentPhase, getCurrentReplayTimeMs } from "./replayClock";
import { BRIGHTON_MARINA_REF, BRIGHTON_TEST_POINT } from "./mapConfig";
import {
  selectAcousticEvents,
  selectStorageFromSnapshot,
  selectTelemetryPackets,
  selectTrackFromHistory,
  type AcousticEventRow,
  type TrackPoint,
} from "./replaySelectors";

export type DeploymentViewModel = {
  deploymentName: string;
  nodeId: string;
  siteName: string;
  hydrophoneLabel: string;
  replayTimeMs: number;
  testDate: string;
  display: {
    testTimeBst: string;
    testTimeUtc: string | null;
  };
  sync: {
    source: "api" | "local";
    label: string;
    errorHidden: boolean;
    paused: boolean;
  };
  phase: {
    id: string;
    label: string;
    colour: string;
  };
  position: { lat: number; lon: number };
  track: TrackPoint[];
  context: {
    estimatedDepthM: number | null;
    seabedType: string | null;
    mpaDistanceKm: number | null;
    source: "configured";
  };
  sidebar: {
    battery: string;
    temp: string;
    depth: string;
    status: string;
    phase: string;
    testTime: string;
  };
  telemetry: {
    seq: number | null;
    packV: string;
    socPct: string;
    phaseLabel: string;
    uploadRate: string;
    filesUploaded: number | null;
    filesPending: number | null;
    packetRate: number;
    recentPackets: ReturnType<typeof selectTelemetryPackets>;
  };
  environment: ReturnType<typeof getEnvironmentMetrics>;
  health: ReturnType<typeof getHealthMetrics> & {
    cpuPct: number;
    memPct: number;
  };
  storage: ReturnType<typeof selectStorageFromSnapshot>;
  battery: { socPct: string; packV: string };
  acoustic: {
    displayLevel: string;
    peakLevel: string;
    calibrated: boolean;
    unit: string;
    eventCount24h: number | null;
    recordingEffortPct: number | null;
    events: AcousticEventRow[];
  };
  wave: ReturnType<typeof getWaveMetrics>;
  location: ReturnType<typeof getLocationMetrics>;
  files: FileRow[];
  alerts: AlertRow[];
  marinaRef: { lat: number; lon: number };
  testPoint: { lat: number; lon: number };
  pinned: { alerts: number; acousticEvents: number; files: number; uploads: number };
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function buildDeploymentViewModel(ctx: BrightonReplayContextValue): DeploymentViewModel {
  const snap = ctx.snapshots;
  const clock = ctx.clock;
  const replayTimeMs = getCurrentReplayTimeMs(clock);
  const phaseDef = getCurrentPhase(clock);
  const meta = getDeploymentMeta();
  const tel = getTelemetryMetrics(snap);
  const env = getEnvironmentMetrics(snap);
  const health = getHealthMetrics(snap);
  const acoustic = getAcousticMetrics(snap);
  const wave = getWaveMetrics(snap);
  const loc = getLocationMetrics(snap);
  const storage = selectStorageFromSnapshot(snap, ctx.tick);
  const track = selectTrackFromHistory(ctx.history.length ? ctx.history : snap ? [snap] : []);
  const replay = getReplayBlock(snap);
  const ctxBlock = asRecord(replay?.context) ?? asRecord(replay?.deployment_context);

  const lat = loc.lat ?? BRIGHTON_TEST_POINT[0];
  const lon = loc.lon ?? BRIGHTON_TEST_POINT[1];

  const cpuRaw = parseFloat(health.cpuPct) || 22;
  const memRaw = parseFloat(health.memPct) || 38;

  const vmBase: DeploymentViewModel = {
    deploymentName: meta.displayName,
    nodeId: meta.nodeId,
    siteName: meta.siteName,
    hydrophoneLabel: meta.hydrophoneLabel,
    replayTimeMs,
    testDate: "2026-05-01",
    display: {
      testTimeBst: getTestTimeLabel(snap, clock),
      testTimeUtc: str(replay?.test_time_utc) ?? snap?.ts ?? null,
    },
    sync: {
      source: ctx.useApiPrimary ? "api" : "local",
      label: syncStatusLabel({ useApi: ctx.useApiPrimary, paused: clock.paused }),
      errorHidden: true,
      paused: clock.paused,
    },
    phase: {
      id: phaseDef.id,
      label: phaseDef.label,
      colour: phaseDef.colour,
    },
    position: { lat, lon },
    track,
    context: {
      estimatedDepthM: num(ctxBlock?.estimated_depth_m) ?? 8,
      seabedType: str(ctxBlock?.seabed_type) ?? "sand / gravel",
      mpaDistanceKm: num(ctxBlock?.mpa_distance_km) ?? 2.4,
      source: "configured",
    },
    sidebar: {
      battery: tel.socPct !== "—" ? tel.socPct : tel.packV,
      temp: env.waterTempC !== "—" ? `${env.waterTempC}°C` : "—",
      depth: "—",
      status: health.status === "ok" ? "Active" : "Maintenance",
      phase: phaseDef.label,
      testTime: getTestTimeLabel(snap, clock),
    },
    telemetry: {
      ...tel,
      packetRate: clock.paused ? 0 : 52 + (ctx.tick % 5),
      recentPackets: [],
    },
    environment: env,
    health: { ...health, cpuPct: cpuRaw, memPct: memRaw },
    storage,
    battery: { socPct: tel.socPct, packV: tel.packV },
    acoustic: {
      displayLevel: acousticLevelLabel(
        parseFloat(acoustic.leqDisplay) || null,
        acoustic.isCalibrated,
      ),
      peakLevel: acousticLevelLabel(
        parseFloat(acoustic.peakDisplay) || null,
        acoustic.isCalibrated,
      ),
      calibrated: acoustic.isCalibrated,
      unit: acousticUnitLabel(acoustic.isCalibrated),
      eventCount24h: acoustic.eventCount24h,
      recordingEffortPct: acoustic.recordingEffortPct,
      events: [],
    },
    wave,
    location: loc,
    files: getFileRows(snap),
    alerts: getAlertRows(snap),
    marinaRef: { lat: BRIGHTON_MARINA_REF[0], lon: BRIGHTON_MARINA_REF[1] },
    testPoint: { lat: BRIGHTON_TEST_POINT[0], lon: BRIGHTON_TEST_POINT[1] },
    pinned: {
      alerts: getAlertRows(snap).length,
      acousticEvents: acoustic.eventCount24h ?? 0,
      files: getFileRows(snap).length,
      uploads: tel.filesUploaded ?? 0,
    },
  };

  vmBase.sidebar.depth =
    vmBase.context.estimatedDepthM != null ? `${vmBase.context.estimatedDepthM} m` : "—";
  vmBase.telemetry.recentPackets = selectTelemetryPackets(vmBase);
  vmBase.acoustic.events = selectAcousticEvents(vmBase);
  return vmBase;
}

export function useDeploymentViewFromContext(
  ctx: BrightonReplayContextValue | null,
): DeploymentViewModel | null {
  if (!isBrightonDemo() || !ctx) return null;
  return buildDeploymentViewModel(ctx);
}
