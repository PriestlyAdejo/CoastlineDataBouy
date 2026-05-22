import { clsx } from "clsx";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useDeploymentView } from "../hooks/useDeploymentView";
import { isBrightonDemo } from "../lib/demoMode";
import { REPLAY_SPEED_PRESETS, listPhases } from "../lib/replayClock";
import { useBrightonReplay } from "./BrightonReplayContext";

export function ReplayControlPanel({ compact = false }: { compact?: boolean }) {
  const replay = useBrightonReplay();
  if (!isBrightonDemo() || !replay) return null;

  const vm = useDeploymentView();
  const phase = replay.getCurrentPhase();
  const timeLabel = vm?.display.testTimeBst ?? replay.getTopbarStatus().testTimeLabel;
  const syncLabel = vm?.sync.label ?? "Replay data";

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2",
        compact ? "text-[10px]" : "text-xs",
      )}
    >
      <span className="font-mono text-amber-400/90 shrink-0">Replay</span>
      <span className="font-mono text-slate-300">{timeLabel}</span>
      <span
        className="font-mono font-semibold px-1.5 py-0.5 rounded border max-w-[140px] truncate leading-tight"
        style={{ borderColor: phase.colour, color: phase.colour }}
        title={phase.label}
      >
        {phase.label}
      </span>
      <span className="font-mono text-slate-500 flex items-center gap-1">
        <span className={vm?.sync.source === "api" ? "h-1.5 w-1.5 rounded-full bg-emerald-500" : "h-1.5 w-1.5 rounded-full bg-amber-500"} />
        {syncLabel}
      </span>

      <button
        type="button"
        onClick={() => (replay.clock.paused ? replay.resumeReplay() : replay.pauseReplay())}
        className="p-1 rounded hover:bg-slate-800 text-slate-300"
        title={replay.clock.paused ? "Resume" : "Pause"}
      >
        {replay.clock.paused ? <Play size={14} /> : <Pause size={14} />}
      </button>

      <select
        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-slate-300"
        value={phase.id}
        onChange={(e) => replay.jumpToPhase(e.target.value)}
      >
        {listPhases().map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <select
        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-slate-300"
        value={replay.clock.speed}
        onChange={(e) => replay.setReplaySpeed(Number(e.target.value))}
      >
        {REPLAY_SPEED_PRESETS.map((s) => (
          <option key={s} value={s}>
            {s}x
          </option>
        ))}
      </select>

      {!compact && (
        <>
          <button type="button" onClick={() => replay.resetToTestStart()} className="font-mono text-slate-400 hover:text-cyan-400">
            <RotateCcw size={12} className="inline mr-0.5" />
            Start
          </button>
          <button type="button" onClick={() => replay.jumpToPhase("free_floating")} className="font-mono text-slate-400 hover:text-cyan-400">
            Free-float
          </button>
          <button type="button" onClick={() => replay.jumpToPhase("anchored_quiet")} className="font-mono text-slate-400 hover:text-cyan-400">
            Anchored
          </button>
          <button type="button" onClick={() => replay.jumpToPhase("anchored_disturbed")} className="font-mono text-slate-400 hover:text-cyan-400">
            <SkipForward size={12} className="inline mr-0.5" />
            Boat circling
          </button>
        </>
      )}
    </div>
  );
}
