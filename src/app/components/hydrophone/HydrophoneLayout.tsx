import { NavLink, Outlet } from "react-router";
import { clsx } from "clsx";
import { useLiveNode } from "../LiveNodeProvider";
import { isBrightonDemo } from "../../lib/demoMode";
import {
  Radio, BarChart3, Waves, Activity, Layers, AudioLines, Clock,
} from "lucide-react";

const primaryTabs = [
  { name: "Summary", path: "/hydrophone", icon: Radio, end: true },
];

const futureTabs = [
  { name: "Daily Events", path: "/hydrophone/daily-events", icon: BarChart3, suffix: "placeholder" },
  { name: "Acoustic Events", path: "/hydrophone/acoustic-events", icon: Waves, suffix: "placeholder" },
  { name: "Soundscape", path: "/hydrophone/soundscape", icon: Layers, suffix: "placeholder" },
  { name: "Spectral Density", path: "/hydrophone/spectral", icon: Activity, suffix: "placeholder" },
  { name: "Sound Levels", path: "/hydrophone/levels", icon: AudioLines, suffix: "placeholder" },
  { name: "Recording Effort", path: "/hydrophone/effort", icon: Clock, suffix: "placeholder" },
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
  const live = useLiveNode();
  const brighton = isBrightonDemo();
  const recording = !brighton && (acousticsRecent(live?.acoustics) || ssdMounted(live?.health));
  const tabs = brighton ? [...primaryTabs, ...futureTabs.map(({ suffix: _, ...t }) => t)] : primaryTabs;
  const showFutureGroup = !brighton;

  return (
    <div className="flex flex-col gap-6">
      {!brighton && acousticsRecent(live?.acoustics) && (
        <div className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--dash-success)", backgroundColor: "var(--dash-success-bg)", color: "var(--dash-success)" }}>
          Audio is being recorded locally to SSD (metadata synced to backend). SPL metrics are uncalibrated unless calibrated.
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold dash-text-primary tracking-tight">Hydrophone recording and file metadata</h1>
          <p className="dash-text-secondary text-sm mt-1">
            Local SSD WAV chunks · backend metadata sync · uncalibrated acoustic levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest border",
              recording ? "text-[var(--dash-success)] border-[var(--dash-success)]" : "dash-text-faint",
            )}
            style={recording ? { backgroundColor: "var(--dash-success-bg)" } : { borderColor: "var(--dash-panel-border)" }}
          >
            {recording && <span className="h-1.5 w-1.5 rounded-full bg-[var(--dash-success)] animate-pulse" />}
            {recording ? "Recording" : "Idle / awaiting chunk"}
          </span>
          <span className="text-xs font-mono dash-text-faint">Uncalibrated · local SSD WAV chunks</span>
        </div>
      </div>

      <div className="flex gap-1 border-b -mb-2 overflow-x-auto" style={{ borderColor: "var(--dash-panel-border)" }}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.path}
            end={"end" in tab ? tab.end : undefined}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px",
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
        {showFutureGroup &&
          futureTabs.map((tab) => (
            <NavLink
              key={tab.name}
              to={tab.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px opacity-80",
                  isActive
                    ? "border-[var(--dash-warning)] text-[var(--dash-warning)]"
                    : "border-transparent dash-text-faint",
                )
              }
            >
              <tab.icon size={13} />
              {tab.name}
              <span className="text-[9px] uppercase">(future)</span>
            </NavLink>
          ))}
      </div>

      <Outlet />
    </div>
  );
}
