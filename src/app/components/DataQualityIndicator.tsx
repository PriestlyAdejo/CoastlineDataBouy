import { useState } from "react";
import { Info, X } from "lucide-react";
import { useDeploymentView } from "../hooks/useDeploymentView";

export function DataQualityIndicator() {
  const vm = useDeploymentView();
  const [open, setOpen] = useState(false);
  if (!vm) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-cyan-400"
        title="Data quality and provenance"
      >
        <Info size={12} />
        Data quality
      </button>
      {open && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-end p-4 sm:items-center sm:justify-center">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">Data quality</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Operational display uses measured values where available; other metrics are estimated for this deployment.
            </p>
            <ul className="text-xs font-mono text-slate-400 space-y-1.5">
              <li>Water temperature: measured</li>
              <li>Wave / motion: inferred from replay model</li>
              <li>Acoustic levels: relative (uncalibrated hydrophone)</li>
              <li>Storage: derived from indexed files + health payload</li>
              <li>Sync: {vm.sync.label}</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
