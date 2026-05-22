import { Card } from "../../components/Card";
import { MetricCard, StatusBadge } from "../../components/Widgets";
import { EVENT_CLASSES, CLASSIFIER_STATUS_STYLES, generateDailyEventData } from "../../components/hydrophone/shared";
import {
  Volume2, Waves, HardDrive, Clock, Activity, Radio, Zap, Database, BarChart3,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, BarChart, Bar } from "recharts";
import { clsx } from "clsx";
import { PinToOverviewButton } from "../../components/OverviewContext";
import { getHydrophoneStationLabel, isBrightonDemo } from "../../lib/demoMode";
import { useDeploymentView } from "../../hooks/useDeploymentView";
import { useReplayData } from "../../lib/useReplayData";

const recentEvents = generateDailyEventData(7);

const clydeSummaryMetrics = [
  { title: "Current SPL", value: "94.2", unit: "dB re 1µPa", trend: "neutral" as const, trendValue: "Typical for conditions", icon: Volume2, status: "normal" as const },
  { title: "Peak Frequency", value: "1.2", unit: "kHz", trend: "up" as const, trendValue: "Vessel traffic elevated", icon: Waves, status: "warning" as const },
  { title: "Events (24h)", value: "47", unit: "events", trend: "up" as const, trendValue: "+12 vs yesterday", icon: Zap, status: "info" as const },
  { title: "Recording Effort", value: "96.4", unit: "%", trend: "neutral" as const, trendValue: "2.16h gap today", icon: Clock, status: "success" as const },
  { title: "Storage Available", value: "45.2", unit: "GB", trend: "down" as const, trendValue: "~12h capacity", icon: HardDrive, status: "normal" as const },
  { title: "Data Latency", value: "12", unit: "sec", trend: "neutral" as const, trendValue: "Within threshold", icon: Database, status: "success" as const },
];

const latestEvents = [
  { id: "EVT-0847", cls: "vessel", time: "14:28:12", confidence: 0.92, level: "104.3 dB" },
  { id: "EVT-0846", cls: "wave", time: "14:22:05", confidence: 0.88, level: "96.1 dB" },
  { id: "EVT-0845", cls: "transient", time: "14:15:33", confidence: 0.67, level: "108.7 dB" },
  { id: "EVT-0844", cls: "rain", time: "13:58:41", confidence: 0.81, level: "89.2 dB" },
  { id: "EVT-0843", cls: "wave", time: "13:42:19", confidence: 0.94, level: "97.8 dB" },
];

export function StationSummary() {
  const vm = useDeploymentView();
  const replay = useReplayData();
  const acoustic = vm?.acoustic;
  const summaryMetrics = isBrightonDemo() && acoustic
    ? [
        { title: "Display Leq", value: acoustic.displayLevel.replace(/ dB.*/, ""), unit: acoustic.unit, trend: "neutral" as const, trendValue: acoustic.calibrated ? "Calibrated" : "Relative level", icon: Volume2, status: "warning" as const },
        { title: "Peak Level", value: acoustic.peakLevel.replace(/ dB.*/, ""), unit: acoustic.unit, trend: "neutral" as const, trendValue: "Field test", icon: Waves, status: "warning" as const },
        { title: "Events (24h)", value: String(acoustic.eventCount24h ?? "—"), unit: "events", trend: "neutral" as const, trendValue: vm?.phase.label ?? "—", icon: Zap, status: "info" as const },
        { title: "Recording Effort", value: String(acoustic.recordingEffortPct ?? "—"), unit: "%", trend: "neutral" as const, trendValue: "Test day", icon: Clock, status: "success" as const },
        { title: "Storage Available", value: vm ? vm.storage.freeGb.toFixed(1) : "—", unit: "GB", trend: "neutral" as const, trendValue: "On buoy", icon: HardDrive, status: "normal" as const },
        { title: "Data Latency", value: "live", unit: "", trend: "neutral" as const, trendValue: vm?.sync.label ?? "—", icon: Database, status: "success" as const },
      ]
    : clydeSummaryMetrics;

  const splTrend = (replay ? replay.getHydrophoneCharts() : Array.from({ length: 48 }, (_, i) => ({
    time: `${i}`,
    leq: 85 + Math.sin(i * 0.3) * 8,
    peak: 95 + Math.sin(i * 0.3) * 8,
  }))).map((p, i) => ({ t: i, spl: "leq" in p ? p.leq : 85, ...p }));

  return (
    <div className="flex flex-col gap-6">
      {/* Station Status Banner */}
      <Card className="!p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Radio size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-100">{getHydrophoneStationLabel()}</span>
                <StatusBadge status="success">Online</StatusBadge>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {isBrightonDemo() ? "96kHz | 32-bit | Replay | 1 May 2026 UTC" : "H1-Omni | 48kHz | 24-bit | Continuous | Last chunk: 14:32:00 UTC"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Soundscape State</div>
              <div className="text-sm font-semibold text-amber-400">Moderately Active</div>
            </div>
            <PinToOverviewButton widget={{ id: "hydrophone-acoustic", source: "Hydrophone", label: "Acoustic Activity Summary", type: "acoustic" }} />
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Dominant Source</div>
              <div className="text-sm font-semibold text-cyan-400">Wave / Surf</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryMetrics.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SPL Trend (last 24h) */}
        <Card title="Noise Level Trend (24h)" className="lg:col-span-2">
          <div className="h-48 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={splTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="splGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.floor(v / 2)}:00`} />
                <YAxis domain={[70, 110]} tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }}
                  labelFormatter={(v) => `${Math.floor(Number(v) / 2)}:${Number(v) % 2 === 0 ? '00' : '30'} UTC`}
                  formatter={(v: number) => [`${v.toFixed(1)} dB`, 'SPL']}
                />
                <Area type="monotone" dataKey="spl" stroke="#06b6d4" fill="url(#splGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] font-mono text-slate-600 mt-1">
            {isBrightonDemo() ? `${acoustic?.unit ?? "dB rel."} (broadband RMS) | test day` : "dB re 1µPa (broadband RMS) | 30-min averages"}
          </div>
        </Card>

        {/* Latest Events */}
        <Card title="Latest Events">
          <div className="space-y-2 mt-1">
            {latestEvents.map((evt) => {
              const cls = EVENT_CLASSES.find((c) => c.id === evt.cls);
              return (
                <div key={evt.id} className="flex items-center justify-between p-2 rounded-md bg-slate-800/40 border border-slate-800 hover:bg-slate-800/60 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cls?.color }} />
                    <div>
                      <div className="text-xs text-slate-300">{cls?.label}</div>
                      <div className="text-[10px] font-mono text-slate-500">{evt.id} | {evt.time}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-slate-400">{evt.level}</div>
                    <div className="text-[10px] font-mono text-slate-500">{Math.round(evt.confidence * 100)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Event Summary */}
        <Card title="Event Summary (7 Days)" action={<span className="text-[10px] font-mono text-slate-500">Stacked by class</span>}>
          <div className="h-48 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentEvents} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="vessel" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="wave" stackId="a" fill="#06b6d4" />
                <Bar dataKey="rain" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="port" stackId="a" fill="#ef4444" />
                <Bar dataKey="transient" stackId="a" fill="#f97316" />
                <Bar dataKey="unknown" stackId="a" fill="#64748b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Classifier Status */}
        <Card title="Event Classifiers">
          <div className="space-y-2 mt-1">
            {EVENT_CLASSES.map((cls) => {
              const style = CLASSIFIER_STATUS_STYLES[cls.status];
              return (
                <div key={cls.id} className="flex items-center justify-between p-2 rounded-md bg-slate-800/30 border border-slate-800/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cls.color, opacity: cls.status === 'future' ? 0.4 : 1 }} />
                    <span className={clsx("text-xs", cls.status === 'future' ? 'text-slate-500' : 'text-slate-300')}>{cls.label}</span>
                  </div>
                  <span className={clsx("text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border", style.bg, style.text, style.border)}>
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}