import { Card } from "../components/Card";
import { StatusBadge } from "../components/Widgets";
import {
  AlertTriangle, Bell, CheckCircle2, Info, XCircle,
  Filter, Search, Clock, Pin,
} from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { PinToOverviewButton } from "../components/OverviewContext";

type Severity = "critical" | "warning" | "info" | "resolved";

interface Alert {
  id: number;
  title: string;
  description: string;
  time: string;
  source: string;
  severity: Severity;
  acknowledged: boolean;
}

const alerts: Alert[] = [
  { id: 1, title: "Battery Voltage Below Threshold", description: "BY-01-C battery at 11.8V — below 12.0V warning threshold. Consider retrieval.", time: "14:22 GMT — 17 Mar 2026", source: "Power Monitor", severity: "critical", acknowledged: false },
  { id: 2, title: "Acoustic Spike Detected — H1", description: "Broadband energy spike at 14:22:05. Possible vessel transit or marine mammal vocalisation.", time: "14:22 GMT — 17 Mar 2026", source: "Hydrophone 1", severity: "warning", acknowledged: false },
  { id: 3, title: "Comm Link Quality Degraded", description: "LoRa RSSI dropped to -95dBm. SNR at 4.2dB — approaching minimum for reliable decode.", time: "11:05 GMT — 17 Mar 2026", source: "LoRa Radio", severity: "warning", acknowledged: false },
  { id: 4, title: "Routine Calibration Due", description: "CTD/environmental sensor calibration check scheduled per 30-day maintenance cycle.", time: "08:00 GMT — 17 Mar 2026", source: "Scheduler", severity: "info", acknowledged: true },
  { id: 5, title: "Bioacoustic Event Logged", description: "Low-frequency pattern (200-400Hz) detected and tagged by onboard classifier. File: bio_event_0317_0645.wav", time: "06:45 GMT — 17 Mar 2026", source: "Hydrophone 2", severity: "info", acknowledged: true },
  { id: 6, title: "GPS Fix Restored", description: "3D fix re-acquired after 12-minute cold-sky period. 8 satellites in view.", time: "05:33 GMT — 17 Mar 2026", source: "GPS Module", severity: "resolved", acknowledged: true },
  { id: 7, title: "Enclosure Humidity Warning Cleared", description: "Internal humidity returned to 38%RH — below 60% warning threshold.", time: "02:15 GMT — 17 Mar 2026", source: "BME280", severity: "resolved", acknowledged: true },
  { id: 8, title: "Storage 15% Threshold", description: "Local storage usage passed 15%. Current: 17.4% (44.6 / 256 GB)", time: "23:59 GMT — 16 Mar 2026", source: "Storage Monitor", severity: "info", acknowledged: true },
];

const severityConfig: Record<Severity, { icon: any; color: string; badge: "error" | "warning" | "info" | "success" | "neutral"; border: string }> = {
  critical: { icon: XCircle, color: "text-rose-400", badge: "error", border: "border-l-rose-500" },
  warning: { icon: AlertTriangle, color: "text-amber-400", badge: "warning", border: "border-l-amber-500" },
  info: { icon: Info, color: "text-cyan-400", badge: "info", border: "border-l-cyan-500" },
  resolved: { icon: CheckCircle2, color: "text-emerald-400", badge: "success", border: "border-l-emerald-500" },
};

export function Alerts() {
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = alerts
    .filter(a => filter === "all" || a.severity === filter)
    .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.source.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    critical: alerts.filter(a => a.severity === "critical").length,
    warning: alerts.filter(a => a.severity === "warning").length,
    info: alerts.filter(a => a.severity === "info").length,
    resolved: alerts.filter(a => a.severity === "resolved").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Alerts & Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">System alerts, threshold breaches, and event notifications.</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status="warning">{alerts.filter(a => !a.acknowledged).length} Unacknowledged</StatusBadge>
          <PinToOverviewButton widget={{ id: "alerts-recent", source: "Alerts", label: "Recent Alerts", type: "alert" }} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {([
          { key: "critical" as const, label: "Critical", count: counts.critical, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
          { key: "warning" as const, label: "Warnings", count: counts.warning, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { key: "info" as const, label: "Info", count: counts.info, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
          { key: "resolved" as const, label: "Resolved", count: counts.resolved, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        ]).map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(filter === item.key ? "all" : item.key)}
            className={clsx(
              "rounded-lg border p-4 transition-all text-left",
              filter === item.key ? item.bg : "border-slate-800 bg-slate-900/40 hover:bg-slate-800/30"
            )}
          >
            <div className={clsx("text-3xl font-mono", item.color)}>{item.count}</div>
            <div className="text-xs text-slate-500 mt-1">{item.label}</div>
          </button>
        ))}
      </div>

      {/* Search and filter */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search alerts..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          />
        </div>
        {filter !== "all" && (
          <button onClick={() => setFilter("all")} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            Clear filter
          </button>
        )}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map(alert => {
          const cfg = severityConfig[alert.severity];
          const Icon = cfg.icon;
          return (
            <div
              key={alert.id}
              className={clsx(
                "rounded-lg border border-slate-800 p-4 border-l-2 transition-colors hover:bg-slate-800/20",
                cfg.border,
                !alert.acknowledged && "bg-slate-900/60"
              )}
            >
              <div className="flex items-start gap-3">
                <Icon size={18} className={clsx(cfg.color, "mt-0.5 shrink-0")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm text-slate-200 font-medium">{alert.title}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={cfg.badge}>{alert.severity}</StatusBadge>
                      {!alert.acknowledged && (
                        <button className="text-[10px] font-mono text-slate-500 hover:text-cyan-400 px-2 py-0.5 rounded border border-slate-700 hover:border-cyan-500/30 transition-colors">
                          ACK
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{alert.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-slate-600">
                    <span className="flex items-center gap-1"><Clock size={10} /> {alert.time}</span>
                    <span>Source: {alert.source}</span>
                    {alert.acknowledged && <span className="text-emerald-600">Acknowledged</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert thresholds */}
      <Card title="Alert Thresholds (Configurable)" action={<span className="text-[10px] font-mono text-slate-600">Edit in Settings</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2">Parameter</th>
                <th className="px-4 py-2">Warning</th>
                <th className="px-4 py-2">Critical</th>
                <th className="px-4 py-2">Current Value</th>
              </tr>
            </thead>
            <tbody className="text-sm font-mono">
              {[
                { param: "Battery Voltage", warn: "<12.0V", crit: "<11.5V", current: "12.4V", ok: true },
                { param: "Internal Temperature", warn: ">40°C", crit: ">50°C", current: "22.4°C", ok: true },
                { param: "Internal Humidity", warn: ">60%", crit: ">80%", current: "38%", ok: true },
                { param: "LoRa RSSI", warn: "<-90 dBm", crit: "<-100 dBm", current: "-72 dBm", ok: true },
                { param: "Storage Usage", warn: ">80%", crit: ">95%", current: "17.4%", ok: true },
                { param: "Packet Loss Rate", warn: ">2%", crit: ">5%", current: "0.21%", ok: true },
              ].map(row => (
                <tr key={row.param} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-2 text-slate-300">{row.param}</td>
                  <td className="px-4 py-2 text-amber-400">{row.warn}</td>
                  <td className="px-4 py-2 text-rose-400">{row.crit}</td>
                  <td className="px-4 py-2 text-emerald-400">{row.current}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}