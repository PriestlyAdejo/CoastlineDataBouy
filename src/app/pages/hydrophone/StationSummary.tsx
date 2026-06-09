import { Card } from "../../components/Card";
import { MetricCard, StatusBadge } from "../../components/Widgets";
import { EVENT_CLASSES, CLASSIFIER_STATUS_STYLES, generateDailyEventData } from "../../components/hydrophone/shared";
import { RawRecordingChunks } from "../../components/hydrophone/RawRecordingChunks";
import {
  Volume2, HardDrive, Clock, Radio, Zap, Database, BarChart3,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, BarChart, Bar } from "recharts";
import { clsx } from "clsx";
import { PinToOverviewButton } from "../../components/OverviewContext";
import { getHydrophoneStationLabel, isBrightonDemo } from "../../lib/demoMode";
import { useDeploymentView } from "../../hooks/useDeploymentView";
import { useReplayData } from "../../lib/useReplayData";
import { useLiveNode } from "../../components/LiveNodeProvider";
import { cartesianGridProps, xAxisProps, yAxisProps, chartTooltipStyle } from "../../lib/chartTheme";

const recentEvents = generateDailyEventData(7);

const latestEvents = [
  { id: "EVT-0847", cls: "vessel", time: "14:28:12", confidence: 0.92, level: "104.3 dB" },
  { id: "EVT-0846", cls: "wave", time: "14:22:05", confidence: 0.88, level: "96.1 dB" },
];

function acousticsRecent(acoustics: unknown): boolean {
  if (!acoustics || typeof acoustics !== "object") return false;
  const a = acoustics as Record<string, unknown>;
  const ts = (a.ts_end ?? a.ts_start ?? a.ts) as string | undefined;
  if (!ts) return false;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) && Date.now() - ms < 5 * 60 * 1000;
}

function liveRecordingMeta(acoustics: unknown, health: unknown) {
  const a = (acoustics && typeof acoustics === "object" ? acoustics : {}) as Record<string, unknown>;
  const h = (health && typeof health === "object" ? health : {}) as Record<string, unknown>;
  const storage = (h.storage ?? {}) as Record<string, unknown>;
  const fmt = (a.format ?? {}) as Record<string, unknown>;
  const artifact = (a.artifact ?? {}) as Record<string, unknown>;
  const device = (a.device ?? {}) as Record<string, unknown>;
  const metrics = (a.display_metrics ?? {}) as Record<string, unknown>;
  const tsStart = String(a.ts_start ?? "—");
  const tsEnd = String(a.ts_end ?? a.ts_start ?? "—");
  const mount = storage.mountpoint ? String(storage.mountpoint) : "—";
  const durationS =
    tsStart !== "—" && tsEnd !== "—"
      ? Math.max(0, (Date.parse(tsEnd) - Date.parse(tsStart)) / 1000)
      : null;
  const sizeBytes = artifact.size_bytes ?? a.size_bytes;
  const sizeMb =
    sizeBytes != null && Number.isFinite(Number(sizeBytes))
      ? `${(Number(sizeBytes) / (1024 * 1024)).toFixed(2)} MB`
      : "—";
  const formatStr = [
    fmt.sample_rate_hz != null ? `${fmt.sample_rate_hz} Hz` : null,
    fmt.channels != null ? `${fmt.channels} ch` : null,
    fmt.bit_depth != null ? `${fmt.bit_depth}-bit` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "—";
  return {
    tsStart,
    tsEnd,
    durationS,
    mount,
    formatStr,
    path: String(a.file_path ?? artifact.path ?? "—"),
    device: String(device.hw_id ?? device.card_name ?? a.capture_device ?? "—"),
    calibration: String(a.calibration_status ?? "uncalibrated"),
    syncStatus: String(a.sync_status ?? "metadata_synced"),
    sizeMb,
    rms: metrics.rms_dbfs ?? metrics.rms_db,
    peak: metrics.peak_dbfs ?? metrics.peak_db,
    clippingPct: metrics.clipping_pct,
    crestFactor: metrics.crest_factor,
  };
}

export function StationSummary() {
  const vm = useDeploymentView();
  const replay = useReplayData();
  const live = useLiveNode();
  const acoustic = vm?.acoustic;
  const brighton = isBrightonDemo();

  if (!brighton) {
    const meta = liveRecordingMeta(live?.acoustics, live?.health);
    const recording = acousticsRecent(live?.acoustics);
    const h = (live?.health ?? {}) as Record<string, unknown>;
    const storage = (h.storage ?? {}) as Record<string, unknown>;
    const freeGb =
      storage.free_bytes != null
        ? (Number(storage.free_bytes) / (1024 ** 3)).toFixed(1)
        : "—";

    return (
      <div className="flex flex-col gap-6">
        <Card className="!p-0">
          <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg border text-[var(--dash-accent)]" style={{ borderColor: "var(--dash-accent)", backgroundColor: "var(--dash-accent-bg)" }}>
                <Radio size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold dash-text-primary">{getHydrophoneStationLabel()}</span>
                  <StatusBadge status={recording ? "success" : "neutral"}>
                    {recording ? "Recording" : "Idle / awaiting chunk"}
                  </StatusBadge>
                </div>
                <span className="text-xs font-mono dash-text-faint">
                  Local SSD WAV · metadata synced · calibration: uncalibrated
                </span>
              </div>
            </div>
            <PinToOverviewButton widget={{ id: "hydrophone-acoustic", source: "Hydrophone", label: "Recording status", type: "acoustic" }} />
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard title="Recording status" value={recording ? "Active" : "Idle"} trend="neutral" trendValue={recording ? "Chunk in progress or recent" : "No recent chunk"} icon={Volume2} status={recording ? "success" : "normal"} />
          <MetricCard title="Latest chunk end" value={meta.tsEnd !== "—" ? meta.tsEnd.slice(11, 19) : "—"} unit="UTC" trend="neutral" trendValue={meta.tsEnd} icon={Clock} status="info" />
          <MetricCard title="Chunk duration" value={meta.durationS != null ? String(meta.durationS) : "—"} unit="s" trend="neutral" trendValue="From metadata timestamps" icon={Clock} status="normal" />
          <MetricCard title="Format" value={meta.formatStr.split(" · ")[0] ?? "—"} unit="" trend="neutral" trendValue={meta.formatStr} icon={Database} status="normal" />
          <MetricCard title="File size" value={meta.sizeMb.replace(" MB", "")} unit="MB" trend="neutral" trendValue="Latest chunk on SSD" icon={HardDrive} status="normal" />
          <MetricCard title="Capture device" value={meta.device} unit="" trend="neutral" trendValue="ALSA hw id" icon={Radio} status="normal" />
          <MetricCard title="SSD mount" value={meta.mount} unit="" trend="neutral" trendValue={storage.mount_ok ? "Mounted" : "Check mount"} icon={HardDrive} status={storage.mount_ok ? "success" : "warning"} />
          <MetricCard title="Storage free" value={freeGb} unit="GB" trend="neutral" trendValue="On Pi SSD" icon={HardDrive} status="normal" />
          <MetricCard title="Calibration" value={meta.calibration} unit="" trend="neutral" trendValue="Not SPL-calibrated" icon={Volume2} status="warning" />
          <MetricCard title="Sync status" value={live?.modeLabel === "LIVE API" ? "Synced" : "—"} unit="" trend="neutral" trendValue={meta.syncStatus} icon={Zap} status="success" />
        </div>

        {(meta.rms != null || meta.peak != null || meta.clippingPct != null || meta.crestFactor != null) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {meta.rms != null && (
              <MetricCard title="RMS level" value={Number(meta.rms).toFixed(1)} unit="dBFS" trend="neutral" trendValue="Uncalibrated · dBFS" icon={BarChart3} status="warning" />
            )}
            {meta.peak != null && (
              <MetricCard title="Peak level" value={Number(meta.peak).toFixed(1)} unit="dBFS" trend="neutral" trendValue="Uncalibrated · dBFS" icon={BarChart3} status="warning" />
            )}
            {meta.clippingPct != null && (
              <MetricCard title="Clipping" value={Number(meta.clippingPct).toFixed(2)} unit="%" trend="neutral" trendValue="From metadata if computed" icon={BarChart3} status="normal" />
            )}
            {meta.crestFactor != null && (
              <MetricCard title="Crest factor" value={Number(meta.crestFactor).toFixed(2)} unit="" trend="neutral" trendValue="From metadata if computed" icon={BarChart3} status="normal" />
            )}
          </div>
        )}

        <div className="rounded-lg border px-4 py-3 text-sm dash-text-secondary break-words" style={{ borderColor: "var(--dash-panel-border)" }}>
          <strong className="dash-text-primary">Raw SSD recording proof.</strong>{" "}
          Local path: <span className="font-mono dash-text-primary">{meta.path}</span>.{" "}
          <strong className="dash-text-primary">Uncalibrated levels.</strong> SPL in dB re 1µPa is not claimed. RMS/peak shown only as dBFS when present in metadata.
        </div>

        <RawRecordingChunks />
      </div>
    );
  }

  const summaryMetrics = acoustic
    ? [
        { title: "Display Leq", value: acoustic.displayLevel.replace(/ dB.*/, ""), unit: acoustic.unit, trend: "neutral" as const, trendValue: acoustic.calibrated ? "Calibrated" : "Relative level", icon: Volume2, status: "warning" as const },
        { title: "Peak Level", value: acoustic.peakLevel.replace(/ dB.*/, ""), unit: acoustic.unit, trend: "neutral" as const, trendValue: "Field test", icon: Volume2, status: "warning" as const },
        { title: "Events (24h)", value: String(acoustic.eventCount24h ?? "—"), unit: "events", trend: "neutral" as const, trendValue: vm?.phase.label ?? "—", icon: Zap, status: "info" as const },
        { title: "Recording Effort", value: String(acoustic.recordingEffortPct ?? "—"), unit: "%", trend: "neutral" as const, trendValue: "Test day", icon: Clock, status: "success" as const },
        { title: "Storage Available", value: vm ? vm.storage.freeGb.toFixed(1) : "—", unit: "GB", trend: "neutral" as const, trendValue: "On buoy", icon: HardDrive, status: "normal" as const },
        { title: "Data Latency", value: "live", unit: "", trend: "neutral" as const, trendValue: vm?.sync.label ?? "—", icon: Database, status: "success" as const },
      ]
    : [];

  const splTrend = (replay ? replay.getHydrophoneCharts() : []).map((p, i) => ({ t: i, spl: "leq" in p ? p.leq : 85, ...p }));
  const grid = cartesianGridProps();
  const tip = chartTooltipStyle();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border px-4 py-2 text-sm dash-text-secondary" style={{ borderColor: "var(--dash-warning)", backgroundColor: "var(--dash-warning-bg)", color: "var(--dash-badge-replay-text)" }}>
        Brighton Marina replay overview · latest replay chunk · recording effort · calibration/replay status
      </div>
      <Card className="!p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg border text-[var(--dash-accent)]" style={{ borderColor: "var(--dash-accent)", backgroundColor: "var(--dash-accent-bg)" }}>
              <Radio size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold dash-text-primary">{getHydrophoneStationLabel()}</span>
                <StatusBadge status="success">Replay</StatusBadge>
              </div>
              <span className="text-xs font-mono dash-text-faint">96kHz | 32-bit | Brighton replay | 1 May 2026 UTC</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryMetrics.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Noise Level Trend (24h)" className="lg:col-span-2">
          <div className="h-48 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={splTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid {...grid} />
                <XAxis {...xAxisProps({ tickFormatter: (v) => `${Math.floor(Number(v) / 2)}:00` })} dataKey="t" />
                <YAxis {...yAxisProps({ domain: [70, 110] })} />
                <Tooltip {...tip} />
                <Area type="monotone" dataKey="spl" stroke="var(--dash-accent)" fill="var(--dash-accent-bg)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Latest Events (replay demo)">
          <div className="space-y-2 mt-1">
            {latestEvents.map((evt) => {
              const cls = EVENT_CLASSES.find((c) => c.id === evt.cls);
              return (
                <div key={evt.id} className="flex items-center justify-between p-2 rounded-md border" style={{ borderColor: "var(--dash-panel-border)" }}>
                  <div className="text-xs dash-text-primary">{cls?.label}</div>
                  <div className="text-[10px] font-mono dash-text-faint">{evt.time}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Event Summary (7 Days)" action={<BarChart3 size={14} className="dash-text-faint" />}>
          <div className="h-48 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentEvents} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid {...grid} />
                <XAxis {...xAxisProps()} dataKey="label" />
                <YAxis {...yAxisProps()} />
                <Tooltip {...tip} />
                <Bar dataKey="vessel" stackId="a" fill="#f59e0b" />
                <Bar dataKey="wave" stackId="a" fill="var(--dash-accent)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Event Classifiers (replay demo)">
          <div className="space-y-2 mt-1">
            {EVENT_CLASSES.map((cls) => {
              const style = CLASSIFIER_STATUS_STYLES[cls.status];
              return (
                <div key={cls.id} className="flex items-center justify-between p-2 rounded-md border" style={{ borderColor: "var(--dash-panel-border)" }}>
                  <span className="text-xs dash-text-primary">{cls.label}</span>
                  <span className={clsx("text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border", style.bg, style.text, style.border)}>
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
