import { Card } from "../components/Card";
import { StatusBadge } from "../components/Widgets";
import {
  Download, FileArchive, FileText, HardDrive, Search, Calendar,
  Filter, FolderOpen, Play, Eye, Clock, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

type FileCategory = "all" | "audio" | "telemetry" | "sensor" | "system";

interface FileEntry {
  name: string;
  size: string;
  category: Exclude<FileCategory, "all">;
  date: string;
  duration?: string;
  sampleRate?: string;
  records?: string;
}

const files: FileEntry[] = [
  { name: "hydrophone_raw_2026-03-17_00-06.wav", size: "2.1 GB", category: "audio", date: "17 Mar 06:00", duration: "6h", sampleRate: "48kHz / 24-bit" },
  { name: "hydrophone_raw_2026-03-17_06-12.wav", size: "2.1 GB", category: "audio", date: "17 Mar 12:00", duration: "6h", sampleRate: "48kHz / 24-bit" },
  { name: "hydrophone_raw_2026-03-16.wav", size: "4.2 GB", category: "audio", date: "16 Mar 23:59", duration: "24h", sampleRate: "48kHz / 24-bit" },
  { name: "bio_event_0317_0645.wav", size: "12 MB", category: "audio", date: "17 Mar 06:45", duration: "30s", sampleRate: "48kHz / 24-bit" },
  { name: "telemetry_2026-03-17.csv", size: "8.4 MB", category: "telemetry", date: "17 Mar (ongoing)", records: "2,847 packets" },
  { name: "telemetry_2026-03-16.csv", size: "11.2 MB", category: "telemetry", date: "16 Mar 23:59", records: "4,128 packets" },
  { name: "telemetry_2026-03-15.csv", size: "10.8 MB", category: "telemetry", date: "15 Mar 23:59", records: "3,996 packets" },
  { name: "env_sensors_2026-03-17.json", size: "3.2 MB", category: "sensor", date: "17 Mar (ongoing)", records: "8,640 readings" },
  { name: "env_sensors_2026-03-16.json", size: "5.1 MB", category: "sensor", date: "16 Mar 23:59", records: "17,280 readings" },
  { name: "gps_track_2026-03-17.gpx", size: "0.4 MB", category: "sensor", date: "17 Mar (ongoing)", records: "2,847 fixes" },
  { name: "imu_motion_2026-03-17.bin", size: "18 MB", category: "sensor", date: "17 Mar (ongoing)", records: "50Hz stream" },
  { name: "system_health_2026-03-17.log", size: "1.8 MB", category: "system", date: "17 Mar (ongoing)" },
  { name: "system_health_2026-03-16.log", size: "2.1 MB", category: "system", date: "16 Mar 23:59" },
  { name: "watchdog_events_2026-03.log", size: "0.2 MB", category: "system", date: "17 Mar (ongoing)" },
];

const categoryConfig = {
  audio: { icon: FileArchive, color: "text-cyan-400", label: "Audio" },
  telemetry: { icon: FileText, color: "text-blue-400", label: "Telemetry" },
  sensor: { icon: FileText, color: "text-emerald-400", label: "Sensor" },
  system: { icon: FileText, color: "text-slate-400", label: "System" },
};

export function Files() {
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
          <p className="text-slate-500 text-sm mt-1">Browse, preview, and download indexed data files from BY-04-A local storage.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 flex items-center gap-2 text-xs text-slate-300 font-mono">
            <HardDrive size={14} className="text-cyan-400" />
            <span>44.6 / 256 GB</span>
            <div className="w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 w-[17%]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 items-center">
        {(["all", "audio", "telemetry", "sensor", "system"] as FileCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              category === cat
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                : "text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
            )}
          >
            {cat === "all" ? "All Files" : categoryConfig[cat].label}
            <span className="ml-1.5 text-[10px] text-slate-500">
              ({cat === "all" ? files.length : files.filter(f => f.category === cat).length})
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search file names..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors text-xs">
          <Calendar size={14} /> Date Range
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File list */}
        <div className="lg:col-span-2">
          <Card className="flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2">File</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Size</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filtered.map((file, i) => {
                    const cfg = categoryConfig[file.category];
                    const Icon = cfg.icon;
                    return (
                      <tr
                        key={i}
                        onClick={() => setSelectedFile(file)}
                        className={clsx(
                          "border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors cursor-pointer group",
                          selectedFile?.name === file.name && "bg-slate-800/30"
                        )}
                      >
                        <td className="px-4 py-2.5 flex items-center gap-2.5">
                          <Icon size={14} className={cfg.color} />
                          <span className="font-mono text-slate-200 text-xs group-hover:text-cyan-400 transition-colors truncate max-w-xs">{file.name}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{file.date}</td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{file.size}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button className="text-slate-500 hover:text-cyan-400 transition-colors p-1">
                            <Download size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-between items-center text-xs text-slate-600 px-4">
              <span>Showing {filtered.length} of {files.length} files</span>
            </div>
          </Card>
        </div>

        {/* File detail panel */}
        <div>
          <Card title={selectedFile ? "File Details" : "Select a File"} className="!bg-slate-900/60 sticky top-6">
            {selectedFile ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between"><span className="text-slate-500">NAME</span></div>
                <div className="text-slate-200 break-all text-[11px]">{selectedFile.name}</div>
                <div className="flex justify-between pt-2 border-t border-slate-800"><span className="text-slate-500">SIZE</span><span className="text-slate-200">{selectedFile.size}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">DATE</span><span className="text-slate-200">{selectedFile.date}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">TYPE</span><span className="text-slate-200">{categoryConfig[selectedFile.category].label}</span></div>
                {selectedFile.duration && <div className="flex justify-between"><span className="text-slate-500">DURATION</span><span className="text-slate-200">{selectedFile.duration}</span></div>}
                {selectedFile.sampleRate && <div className="flex justify-between"><span className="text-slate-500">FORMAT</span><span className="text-slate-200">{selectedFile.sampleRate}</span></div>}
                {selectedFile.records && <div className="flex justify-between"><span className="text-slate-500">RECORDS</span><span className="text-slate-200">{selectedFile.records}</span></div>}
                <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
                  <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors text-xs font-medium">
                    <Download size={14} /> Download
                  </button>
                  {selectedFile.category === "audio" && (
                    <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors text-xs font-medium">
                      <Play size={14} /> Preview (30s clip)
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                <FolderOpen size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-xs">Click a file to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
