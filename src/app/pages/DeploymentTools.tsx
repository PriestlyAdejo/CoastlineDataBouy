import { Card } from "../components/Card";
import { StatusBadge } from "../components/Widgets";
import {
  Compass, CheckCircle2, AlertTriangle, Wind, Waves, Thermometer,
  MapPin, Clock, Anchor, Shield, Radio, Battery, Eye,
} from "lucide-react";
import { clsx } from "clsx";
import { getSiteDescription, getSitePositionLabel, isBrightonDemo } from "../lib/demoMode";
import { useReplayData } from "../lib/useReplayData";

interface ChecklistItem {
  label: string;
  status: "pass" | "warn" | "fail" | "pending";
  detail: string;
}

const preDeployChecklist: ChecklistItem[] = [
  { label: "Battery Charged", status: "pass", detail: "12.6V — Full charge confirmed" },
  { label: "Storage Cleared / Available", status: "pass", detail: "211 GB free (82%)" },
  { label: "GPS Fix Acquired", status: "pass", detail: "3D fix — 8 satellites" },
  { label: "Hydrophone Self-Test", status: "pass", detail: "Noise floor nominal — -42 dBFS" },
  { label: "LoRa Link Test", status: "pass", detail: "RSSI -68 dBm, SNR 12.4 dB" },
  { label: "Environmental Sensors", status: "pass", detail: "BME280 + DS18B20 responding" },
  { label: "Watchdog Active", status: "pass", detail: "30s timeout — kick OK" },
  { label: "Clock Synchronised", status: "warn", detail: "NTP sync pending — GPS time fallback active" },
  { label: "Enclosure Sealed", status: "pending", detail: "Manual inspection required" },
  { label: "Mooring Hardware", status: "pending", detail: "Manual inspection required" },
];

const weatherConditions = [
  { label: "Wind Speed", value: "12 kts", icon: Wind, ok: true },
  { label: "Wind Direction", value: "NW (315°)", icon: Compass, ok: true },
  { label: "Wave Height", value: "1.4 m", icon: Waves, ok: true },
  { label: "Swell Period", value: "8 s", icon: Waves, ok: true },
  { label: "Air Temperature", value: "11°C", icon: Thermometer, ok: true },
  { label: "Visibility", value: ">10 km", icon: Eye, ok: true },
  { label: "Tide State", value: "Ebbing — 2h post HW", icon: Anchor, ok: true },
];

const deploymentLog = [
  { date: "17 Mar 2026 09:15", event: "Pre-deployment checks initiated", status: "info" as const },
  { date: "17 Mar 2026 09:22", event: "All sensor self-tests passed", status: "success" as const },
  { date: "17 Mar 2026 09:30", event: "LoRa range test — shore station confirmed", status: "success" as const },
  { date: "17 Mar 2026 09:45", event: "NTP sync timeout — using GPS time", status: "warning" as const },
  { date: "17 Mar 2026 10:00", event: "Deployment window assessment: SUITABLE", status: "success" as const },
];

export function DeploymentTools() {
  const replay = useReplayData();
  const loc = replay?.getLocationMetrics();
  const passCount = preDeployChecklist.filter(c => c.status === "pass").length;
  const totalCount = preDeployChecklist.length;
  const deploymentLogBrighton = loc
    ? [
        { date: "1 May 2026 11:37", event: `Phase: ${loc.phaseLabel ?? loc.phaseKey}`, status: "info" as const },
        { date: "1 May 2026 12:14", event: "Anchored at test point SW of marina", status: "success" as const },
        { date: "1 May 2026 12:53", event: "Field test complete — return to dock", status: "success" as const },
      ]
    : deploymentLog;
  const log = isBrightonDemo() ? deploymentLogBrighton : deploymentLog;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Deployment Tools</h1>
          <p className="text-slate-500 text-sm mt-1">Pre-deployment checks, weather assessment, and deployment planning.</p>
        </div>
        <StatusBadge status="success">Window: Suitable</StatusBadge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pre-deploy checklist */}
        <Card title={`Pre-Deployment Checklist (${passCount}/${totalCount})`}>
          <div className="space-y-2">
            {preDeployChecklist.map(item => (
              <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                {item.status === "pass" ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> :
                 item.status === "warn" ? <AlertTriangle size={16} className="text-amber-400 shrink-0" /> :
                 item.status === "fail" ? <AlertTriangle size={16} className="text-rose-400 shrink-0" /> :
                 <div className="w-4 h-4 rounded-full border-2 border-slate-600 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200">{item.label}</div>
                  <div className="text-[10px] font-mono text-slate-500">{item.detail}</div>
                </div>
                <StatusBadge status={item.status === "pass" ? "success" : item.status === "warn" ? "warning" : item.status === "fail" ? "error" : "neutral"}>
                  {item.status}
                </StatusBadge>
              </div>
            ))}
          </div>
        </Card>

        {/* Weather & conditions */}
        <div className="space-y-6">
          <Card title="Weather & Sea Conditions">
            <div className="space-y-3">
              {weatherConditions.map(w => (
                <div key={w.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <w.icon size={14} className="text-slate-500" />
                    {w.label}
                  </div>
                  <span className={clsx("text-sm font-mono", w.ok ? "text-slate-200" : "text-amber-400")}>{w.value}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Deployment Suitability</span>
                  <StatusBadge status="success">Suitable — Low Risk</StatusBadge>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Deployment Site" className="!bg-slate-900/60">
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between"><span className="text-slate-500">SITE</span><span className="text-slate-200">{getSiteDescription()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">POSITION</span><span className="text-slate-200">{getSitePositionLabel()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">DEPTH (CHART)</span><span className="text-slate-200">~45 m</span></div>
              <div className="flex justify-between"><span className="text-slate-500">SEABED</span><span className="text-slate-200">Mud / Sand (estimated)</span></div>
              <div className="flex justify-between"><span className="text-slate-500">MOORING TYPE</span><span className="text-slate-200">Taut-line w/ subsurface float</span></div>
              <div className="flex justify-between"><span className="text-slate-500">NEAREST PORT</span><span className="text-slate-200">Largs Marina — 4.2 nm</span></div>
            </div>
          </Card>
        </div>
      </div>

      {/* Deployment activity log */}
      <Card title="Deployment Activity Log">
        <div className="space-y-1">
          {log.map((entry, i) => (
            <div key={i} className="flex items-center gap-4 px-3 py-2 rounded hover:bg-slate-800/20 transition-colors">
              <span className="text-[10px] font-mono text-slate-600 w-40 shrink-0">{entry.date}</span>
              <StatusBadge status={entry.status === "success" ? "success" : entry.status === "warning" ? "warning" : "info"}>
                {entry.status}
              </StatusBadge>
              <span className="text-xs text-slate-300">{entry.event}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Run All Self-Tests", icon: Shield },
          { label: "LoRa Range Test", icon: Radio },
          { label: "GPS Cold Start", icon: MapPin },
          { label: "Power Budget Check", icon: Battery },
        ].map(action => (
          <button
            key={action.label}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-800/40 hover:border-slate-700 transition-colors text-slate-300"
          >
            <action.icon size={20} className="text-cyan-400" />
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
