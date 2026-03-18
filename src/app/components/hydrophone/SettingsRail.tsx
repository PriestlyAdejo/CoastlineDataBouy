import { ReactNode, useState } from "react";
import { clsx } from "clsx";
import { SlidersHorizontal, X } from "lucide-react";

export function SettingsRail({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(true);
  
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-6 top-20 z-20 p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
        title="Open settings"
      >
        <SlidersHorizontal size={16} />
      </button>
    );
  }

  return (
    <div className={clsx("w-64 shrink-0 rounded-lg border border-slate-800 bg-slate-900/60 backdrop-blur-sm", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          <SlidersHorizontal size={13} />
          Settings
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="p-4 space-y-5 max-h-[calc(100vh-300px)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      {children}
    </div>
  );
}

export function SettingsToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
          checked ? "bg-cyan-500/40" : "bg-slate-700"
        )}
      >
        <span className={clsx(
          "inline-block h-3 w-3 rounded-full transition-transform",
          checked ? "translate-x-3.5 bg-cyan-400" : "translate-x-0.5 bg-slate-500"
        )} />
      </button>
    </label>
  );
}

export function SettingsSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500/50"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
