import { NavLink, useLocation, useOutlet } from "react-router";
import { clsx } from "clsx";
import { useLiveNode } from "../LiveNodeProvider";
import { isBrightonDemo } from "../../lib/demoMode";
import { useDeploymentView } from "../../hooks/useDeploymentView";
import {
  Radio, BarChart3, Waves, Activity, Layers, AudioLines, Clock,
  FileAudio, LineChart, Ship, Brain, ShieldCheck,
} from "lucide-react";

const liveTabs = [
  { name: "Summary", path: "/hydrophone", icon: Radio, end: true },
  { name: "Raw Chunks", path: "/hydrophone/chunks", icon: FileAudio, end: false },
];

const showcaseTabs = [
  { name: "Overview", path: "/hydrophone", icon: Radio, end: true },
  { name: "Raw Chunks", path: "/hydrophone/chunks", icon: FileAudio, end: false },
  { name: "Waveform", path: "/hydrophone/waveform", icon: LineChart, end: false },
  { name: "PSD", path: "/hydrophone/spectral", icon: Activity, end: false },
  { name: "Spectrogram", path: "/hydrophone/soundscape", icon: Layers, end: false },
  { name: "Band Energy", path: "/hydrophone/levels", icon: AudioLines, end: false },
  { name: "Events", path: "/hydrophone/acoustic-events", icon: Waves, end: false },
  { name: "Vessel", path: "/hydrophone/vessel-mechanical", icon: Ship, end: false },
  { name: "ML Scores", path: "/hydrophone/ml-scores", icon: Brain, end: false },
  { name: "QC", path: "/hydrophone/quality", icon: ShieldCheck, end: false },
];

const futureTabs = [
  { name: "Daily Events", path: "/hydrophone/daily-events", icon: BarChart3 },
  { name: "Recording Effort", path: "/hydrophone/effort", icon: Clock },
];

function acousticsRecent(acoustics: unknown): boolean {
  if (!acoustics || typeof acoustics !== "object") return false;
  const a = acoustics as Record<string, unknown>;
  const ts = (a.ts_end ?? a.ts_start ?? a.ts) as string | undefined;
  if (!ts) return false;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) && Date.now() - ms < 5 * 60 * 1000;
}

function ssdMounted(health: unknown): boolean {
  if (!health || typeof health !== "object") return false;
  const storage = (health as Record<string, unknown>).storage;
  if (!storage || typeof storage !== "object") return false;
  return (storage as Record<string, unknown>).mount_ok === true;
}

export function HydrophoneLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const live = useLiveNode();
  const vm = useDeploymentView();
  const brighton = isBrightonDemo();
  const recording = brighton
    ? Boolean(vm?.acoustic)
    : acousticsRecent(live?.acoustics) || ssdMounted(live?.health);
  const tabs = brighton ? showcaseTabs : liveTabs;

  return (
    <div className="flex flex-col gap-6 hydrophone-card">
      {!brighton && acousticsRecent(live?.acoustics) && (
        <div className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--dash-success)", backgroundColor: "var(--dash-success-bg)", color: "var(--dash-success)" }}>
          Audio is being recorded locally to SSD (metadata synced to backend). SPL metrics are uncalibrated unless calibrated.
        </div>
      )}
      {brighton && (
        <div className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--dash-warning)", backgroundColor: "var(--dash-warning-bg)", color: "var(--dash-badge-replay-text)" }}>
          Brighton Marina replay · prototype post-processing analytics · not live onboard ML
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold dash-text-primary tracking-tight">
            {brighton ? "Hydrophone recording and analytics" : "Hydrophone recording and file metadata"}
          </h1>
          <p className="dash-text-secondary text-sm mt-1">
            {brighton
              ? "Brighton Marina replay · local SSD WAV chunks + backend metadata sync"
              : "Local SSD WAV chunks · backend metadata sync · uncalibrated acoustic levels"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest border max-w-full truncate",
              recording ? "text-[var(--dash-success)] border-[var(--dash-success)]" : "dash-text-faint",
            )}
            style={recording ? { backgroundColor: "var(--dash-success-bg)" } : { borderColor: "var(--dash-panel-border)" }}
          >
            {recording && <span className="h-1.5 w-1.5 rounded-full bg-[var(--dash-success)] animate-pulse shrink-0" />}
            {brighton ? (recording ? "Replay active" : "Replay idle") : recording ? "Recording" : "Idle / awaiting chunk"}
          </span>
          <span className="text-xs font-mono dash-text-faint hidden sm:inline">
            {brighton ? "Replay · dBFS / relative" : "Uncalibrated · local SSD WAV chunks"}
          </span>
        </div>
      </div>

      <div className="flex gap-1 border-b -mb-2 overflow-x-auto" style={{ borderColor: "var(--dash-panel-border)" }}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px shrink-0",
                isActive
                  ? "border-[var(--dash-accent)] text-[var(--dash-accent)]"
                  : "border-transparent dash-text-faint hover:dash-text-primary",
              )
            }
          >
            <tab.icon size={13} />
            {tab.name}
          </NavLink>
        ))}
        {!brighton &&
          futureTabs.map((tab) => (
            <NavLink
              key={tab.name}
              to={tab.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px opacity-80 shrink-0",
                  isActive
                    ? "border-[var(--dash-warning)] text-[var(--dash-warning)]"
                    : "border-transparent dash-text-faint",
                )
              }
            >
              <tab.icon size={13} />
              {tab.name}
              <span className="text-[9px] uppercase font-semibold text-[var(--dash-warning)]">FUTURE</span>
            </NavLink>
          ))}
      </div>

      <div key={location.pathname} className="min-w-0">
        {outlet}
      </div>
    </div>
  );
}
