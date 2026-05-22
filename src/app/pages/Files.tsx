import { Card } from "../components/Card";
import { StatusBadge } from "../components/Widgets";
import {
  Download, FileArchive, FileText, HardDrive, Search, Calendar,
  Filter, FolderOpen, Play, Eye, Clock, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { useState, useMemo } from "react";
import { storageLabel } from "../lib/deploymentDisplay";
import { getPageNodeSubtitle, isBrightonDemo } from "../lib/demoMode";
import { useDeploymentView } from "../hooks/useDeploymentView";

type FileCategory = "all" | "audio" | "telemetry" | "sensor" | "system";

interface FileEntry {
  name: string;
  size: string;
  category: Exclude<FileCategory, "all">;
  date: string;
  duration?: string;
  sampleRate?: string;
  records?: string;
  provenance?: string;
}

const clydeFiles: FileEntry[] = [
  { name: "hydrophone_raw_2026-03-17_00-06.wav", size: "2.1 GB", category: "audio", date: "17 Mar 06:00", duration: "6h", sampleRate: "48kHz / 24-bit" },
  { name: "hydrophone_raw_2026-03-17_06-12.wav", size: "2.1 GB", category: "audio", date: "17 Mar 12:00", duration: "6h", sampleRate: "48kHz / 24-bit" },
  { name: "telemetry_2026-03-17.csv", size: "8.4 MB", category: "telemetry", date: "17 Mar (ongoing)", records: "2,847 packets" },
  { name: "env_sensors_2026-03-17.json", size: "3.2 MB", category: "sensor", date: "17 Mar (ongoing)", records: "8,640 readings" },
  { name: "system_health_2026-03-17.log", size: "1.8 MB", category: "system", date: "17 Mar (ongoing)" },
];

const categoryConfig = {
  audio: { icon: FileArchive, color: "text-cyan-400", label: "Audio" },
  telemetry: { icon: FileText, color: "text-blue-400", label: "Telemetry" },
  sensor: { icon: FileText, color: "text-emerald-400", label: "Sensor" },
  system: { icon: FileText, color: "text-slate-400", label: "System" },
};

export function Files() {
  const vm = useDeploymentView();
  const files = useMemo<FileEntry[]>(() => {
    if (!isBrightonDemo() || !vm) return clydeFiles;
    return vm.files.map((f) => ({
      name: f.name,
      size: f.size,
      category: (f.category === "audio" || f.category === "telemetry" || f.category === "sensor" || f.category === "system"
        ? f.category
        : "system") as Exclude<FileCategory, "all">,
      date: f.date,
      provenance: f.provenance,
      records: f.uploadStatus,
    }));
  }, [vm, vm?.replayTimeMs]);

  const [category, setCategory] = useState<FileCategory>("all");
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);

  const filtered = files
    .filter(f => category === "all" || f.category === category)
    .filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Files & Downloads</h1>
          <p className="text-slate-500 text-sm mt-1">{getPageNodeSubtitle("Browse, preview, and download indexed data files from local storage")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 flex items-center gap-2 text-xs text-slate-300 font-mono">
            <HardDrive size={14} className="text-cyan-400" />
            <span>{vm ? storageLabel(vm.storage.usedGb, vm.storage.totalGb) : "44.6 / 256 GB"}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        {(["all", "audio", "telemetry", "sensor", "system"] as FileCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={clsx(
              "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
              category === cat ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200"
            )}
          >
            {cat === "all" ? "All" : categoryConfig[cat].label}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title={`Indexed Files (${filtered.length})`} className="lg:col-span-2">
          <div className="space-y-1 mt-2 max-h-[480px] overflow-y-auto">
            {filtered.map(file => {
              const cfg = categoryConfig[file.category];
              const Icon = cfg.icon;
              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={clsx(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors text-left",
                    selectedFile?.name === file.name ? "bg-slate-800 border-cyan-500/30" : "border-slate-800 hover:bg-slate-800/40"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={16} className={cfg.color} />
                    <div className="min-w-0">
                      <div className="text-sm text-slate-200 truncate font-mono">{file.name}</div>
                      <div className="text-[10px] text-slate-500">{file.date} · {file.size}</div>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-600 shrink-0" />
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="File Details">
          {selectedFile ? (
            <div className="space-y-3 mt-2 text-sm">
              <div className="font-mono text-cyan-400 break-all">{selectedFile.name}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <span>Size</span><span className="text-slate-200">{selectedFile.size}</span>
                <span>Category</span><span className="text-slate-200">{selectedFile.category}</span>
                <span>Date</span><span className="text-slate-200">{selectedFile.date}</span>
                {selectedFile.provenance && (<><span>Provenance</span><span className="text-slate-200">{selectedFile.provenance}</span></>)}
              </div>
              <StatusBadge status="info">Indexed — download when artifact on server</StatusBadge>
            </div>
          ) : (
            <p className="text-slate-500 text-sm mt-4">Select a file to view details.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
