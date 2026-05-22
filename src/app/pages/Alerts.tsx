import { Card } from "../components/Card";
import { StatusBadge } from "../components/Widgets";
import {
  AlertTriangle, Bell, CheckCircle2, Info, XCircle,
  Filter, Search, Clock, Pin,
} from "lucide-react";
import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { PinToOverviewButton } from "../components/OverviewContext";
import { getPageNodeSubtitle, isBrightonDemo } from "../lib/demoMode";
import { useDeploymentView } from "../hooks/useDeploymentView";

type Severity = "critical" | "warning" | "info" | "resolved";

interface Alert {
  id: string | number;
  title: string;
  description: string;
  time: string;
  source: string;
  severity: Severity;
  acknowledged: boolean;
}

const clydeAlerts: Alert[] = [
  { id: 1, title: "Battery Voltage Below Threshold", description: "BY-01-C battery at 11.8V — below 12.0V warning threshold.", time: "14:22 GMT — 17 Mar 2026", source: "Power Monitor", severity: "critical", acknowledged: false },
  { id: 2, title: "Acoustic Spike Detected — H1", description: "Broadband energy spike at 14:22:05.", time: "14:22 GMT — 17 Mar 2026", source: "Hydrophone 1", severity: "warning", acknowledged: false },
  { id: 3, title: "Comm Link Quality Degraded", description: "LoRa RSSI dropped to -95dBm.", time: "11:05 GMT — 17 Mar 2026", source: "LoRa Radio", severity: "warning", acknowledged: false },
  { id: 4, title: "Routine Calibration Due", description: "Environmental sensor calibration check scheduled.", time: "08:00 GMT — 17 Mar 2026", source: "Scheduler", severity: "info", acknowledged: true },
];

function mapSeverity(s: string): Severity {
  if (s === "critical" || s === "error") return "critical";
  if (s === "warning") return "warning";
  if (s === "resolved" || s === "success") return "resolved";
  return "info";
}

const severityConfig: Record<Severity, { icon: typeof Info; color: string; badge: "error" | "warning" | "info" | "success" | "neutral"; border: string }> = {
  critical: { icon: XCircle, color: "text-rose-400", badge: "error", border: "border-l-rose-500" },
  warning: { icon: AlertTriangle, color: "text-amber-400", badge: "warning", border: "border-l-amber-500" },
  info: { icon: Info, color: "text-cyan-400", badge: "info", border: "border-l-cyan-500" },
  resolved: { icon: CheckCircle2, color: "text-emerald-400", badge: "success", border: "border-l-emerald-500" },
};

export function Alerts() {
  const vm = useDeploymentView();
  const alerts = useMemo<Alert[]>(() => {
    if (!isBrightonDemo() || !vm) return clydeAlerts;
    return vm.alerts.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      time: a.time,
      source: a.source,
      severity: mapSeverity(a.severity),
      acknowledged: a.acknowledged,
    }));
  }, [vm, vm?.replayTimeMs]);

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
          <p className="text-slate-500 text-sm mt-1">{getPageNodeSubtitle("System alerts, acoustic events, and operational notifications")}</p>
        </div>
        <PinToOverviewButton widget={{ id: "alerts-summary", source: "Alerts", label: "Active Alerts", type: "metric" }} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(["critical", "warning", "info", "resolved"] as Severity[]).map(sev => (
          <button
            key={sev}
            onClick={() => setFilter(filter === sev ? "all" : sev)}
            className={clsx(
              "p-3 rounded-lg border text-left transition-colors",
              filter === sev ? "border-cyan-500/40 bg-slate-800" : "border-slate-800 bg-slate-900/30 hover:bg-slate-800/50"
            )}
          >
            <div className="text-[10px] font-mono text-slate-500 uppercase">{sev}</div>
            <div className="text-xl font-semibold text-slate-100">{counts[sev]}</div>
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input
          type="text"
          placeholder="Search alerts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200"
        />
      </div>

      <Card title={`Alerts (${filtered.length})`}>
        <div className="space-y-2 mt-2">
          {filtered.map(alert => {
            const cfg = severityConfig[alert.severity];
            const Icon = cfg.icon;
            return (
              <div key={String(alert.id)} className={clsx("flex gap-3 p-4 rounded-lg border border-slate-800 border-l-4", cfg.border)}>
                <Icon size={18} className={cfg.color} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-100">{alert.title}</span>
                    <StatusBadge status={cfg.badge}>{alert.severity}</StatusBadge>
                    {alert.acknowledged && <StatusBadge status="neutral">Ack</StatusBadge>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{alert.description}</p>
                  <div className="flex gap-3 mt-2 text-[10px] font-mono text-slate-500">
                    <span>{alert.source}</span>
                    <span>{alert.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
