import { NavLink, Outlet } from "react-router";
import { clsx } from "clsx";
import { useLiveNode } from "../LiveNodeProvider";
import { isBrightonDemo } from "../../lib/demoMode";
import {
  Radio, BarChart3, Waves, Activity, Layers, AudioLines, Clock, HardDrive,
} from "lucide-react";

const hydrophoneTabs = [
  { name: "Summary", path: "/hydrophone", icon: Radio, end: true },
  { name: "Daily Events", path: "/hydrophone/daily-events", icon: BarChart3 },
  { name: "Acoustic Events", path: "/hydrophone/acoustic-events", icon: Waves },
  { name: "Soundscape", path: "/hydrophone/soundscape", icon: Layers },
  { name: "Spectral Density", path: "/hydrophone/spectral", icon: Activity },
  { name: "Sound Levels", path: "/hydrophone/levels", icon: AudioLines },
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

export function HydrophoneLayout() {
  const live = useLiveNode();
  const showSsdBanner = !isBrightonDemo() && acousticsRecent(live?.acoustics);

  return (
    <div className="flex flex-col gap-6">
      {showSsdBanner && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          Audio is being recorded locally to SSD (metadata synced to backend). SPL metrics are uncalibrated unless calibrated.
        </div>
      )}
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Acoustic Analysis</h1>
          <p className="text-slate-500 text-sm mt-1">Coastal hydrophone monitoring & acoustic analytics suite</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Recording
          </span>
          <span className="text-xs font-mono text-slate-400">Uncalibrated · local SSD WAV chunks</span>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 border-b border-slate-800 -mb-2 overflow-x-auto">
        {hydrophoneTabs.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px",
                isActive
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600"
              )
            }
          >
            <tab.icon size={13} />
            {tab.name}
          </NavLink>
        ))}
      </div>

      {/* Page content */}
      <Outlet />
    </div>
  );
}
