import { Card } from "../components/Card";
import { Folder, FileText, Download, Calendar, Search, Filter, HardDrive, FileArchive } from "lucide-react";
import { clsx } from "clsx";

export function HistoricalData() {
  const files = [
    { name: "hydrophone_raw_2026-03-11.wav", size: "4.2 GB", type: "audio", date: "Mar 11, 2026 23:59 GMT" },
    { name: "telemetry_log_2026-03-11.csv", size: "12 MB", type: "data", date: "Mar 11, 2026 23:59 GMT" },
    { name: "ctd_sensor_2026-03-11.json", size: "8.4 MB", type: "data", date: "Mar 11, 2026 23:59 GMT" },
    { name: "system_health_2026-03-11.log", size: "2.1 MB", type: "log", date: "Mar 11, 2026 23:59 GMT" },
    { name: "hydrophone_raw_2026-03-10.wav", size: "4.1 GB", type: "audio", date: "Mar 10, 2026 23:59 GMT" },
    { name: "telemetry_log_2026-03-10.csv", size: "11 MB", type: "data", date: "Mar 10, 2026 23:59 GMT" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Data Archive & Explorer</h1>
          <p className="text-slate-500 text-sm mt-1">Browse and download historical sensor logs and acoustic payloads.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 flex items-center gap-2 text-sm text-slate-300">
             <HardDrive size={16} className="text-cyan-400" />
             <span>Storage: 45GB / 256GB</span>
             <div className="w-16 h-1.5 bg-slate-900 rounded-full ml-2 overflow-hidden">
                <div className="h-full bg-cyan-500 w-[17%]"></div>
             </div>
           </div>
        </div>
      </div>

      <div className="flex gap-4 items-center">
         <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search file names, sensor types..." 
              className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
         </div>
         <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-slate-700 transition-colors text-sm font-medium">
           <Calendar size={16} />
           Date Range
         </button>
         <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-slate-700 transition-colors text-sm font-medium">
           <Filter size={16} />
           Filters
         </button>
      </div>

      <Card className="flex-1">
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">File Name</th>
                    <th className="px-4 py-3 font-medium">Date Modified</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="text-sm">
                 {files.map((file, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                       <td className="px-4 py-3 flex items-center gap-3">
                          {file.type === "audio" ? (
                             <FileArchive size={16} className="text-cyan-400" />
                          ) : file.type === "data" ? (
                             <FileText size={16} className="text-emerald-400" />
                          ) : (
                             <FileText size={16} className="text-slate-400" />
                          )}
                          <span className="font-mono text-slate-200 group-hover:text-cyan-400 transition-colors">{file.name}</span>
                       </td>
                       <td className="px-4 py-3 text-slate-400 font-mono text-xs">{file.date}</td>
                       <td className="px-4 py-3 text-slate-400 font-mono text-xs">{file.size}</td>
                       <td className="px-4 py-3 text-right">
                          <button className="text-slate-500 hover:text-cyan-400 transition-colors p-1">
                             <Download size={16} />
                          </button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
        <div className="mt-4 flex justify-between items-center text-xs text-slate-500 px-4">
           <span>Showing 1-6 of 248 files</span>
           <div className="flex gap-1">
              <button className="px-2 py-1 hover:text-slate-300 transition-colors disabled:opacity-50" disabled>Prev</button>
              <button className="px-2 py-1 hover:text-slate-300 transition-colors">Next</button>
           </div>
        </div>
      </Card>
    </div>
  );
}
