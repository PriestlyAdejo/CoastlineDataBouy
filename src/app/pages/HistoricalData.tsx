import { Card } from "../components/Card";
import { Folder, FileText, Download, Calendar, Search, Filter, HardDrive, FileArchive } from "lucide-react";
import { clsx } from "clsx";
import { useMemo } from "react";
import { getPageNodeSubtitle, isBrightonDemo } from "../lib/demoMode";
import { storageLabel } from "../lib/deploymentDisplay";
import { useDeploymentView } from "../hooks/useDeploymentView";

export function HistoricalData() {
  const vm = useDeploymentView();
  const files = useMemo(() => {
    if (!isBrightonDemo() || !vm) {
      return [
        { name: "hydrophone_raw_2026-03-11.wav", size: "4.2 GB", type: "audio", date: "Mar 11, 2026 23:59 GMT" },
        { name: "telemetry_log_2026-03-11.csv", size: "12 MB", type: "data", date: "Mar 11, 2026 23:59 GMT" },
      ];
    }
    return vm.files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.category,
      date: f.date,
    }));
  }, [vm, vm?.replayTimeMs]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Data Archive & Explorer</h1>
          <p className="text-slate-500 text-sm mt-1">{getPageNodeSubtitle("Browse and download historical sensor logs and acoustic payloads")}</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 flex items-center gap-2 text-sm text-slate-300">
             <HardDrive size={16} className="text-cyan-400" />
             <span>{vm ? storageLabel(vm.storage.usedGb, vm.storage.totalGb) : "Storage: 45GB / 256GB"}</span>
           </div>
        </div>
      </div>

      <Card title="Archive Files">
        <div className="divide-y divide-slate-800 mt-2">
          {files.map((file) => (
            <div key={file.name} className="flex items-center justify-between py-3 px-2 hover:bg-slate-800/30">
              <div className="flex items-center gap-3">
                {file.type === "audio" ? <FileArchive size={16} className="text-cyan-400" /> : <FileText size={16} className="text-slate-400" />}
                <div>
                  <div className="text-sm font-mono text-slate-200">{file.name}</div>
                  <div className="text-[10px] text-slate-500">{file.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">{file.size}</span>
                <button className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400"><Download size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
