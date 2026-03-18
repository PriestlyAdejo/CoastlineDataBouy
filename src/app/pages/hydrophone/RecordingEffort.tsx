import { Card } from "../../components/Card";
import { MetricCard } from "../../components/Widgets";
import { generateRecordingEffortData } from "../../components/hydrophone/shared";
import { SettingsRail, SettingsGroup, SettingsToggle, SettingsSelect } from "../../components/hydrophone/SettingsRail";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine, Cell } from "recharts";
import { Clock, HardDrive, AlertTriangle, CheckCircle, Download } from "lucide-react";
import { clsx } from "clsx";

const data = generateRecordingEffortData(60);

export function RecordingEffort() {
  const [threshold, setThreshold] = useState("80");
  const [showThreshold, setShowThreshold] = useState(true);
  const [period, setPeriod] = useState("60");

  const displayData = useMemo(() => data.slice(-Number(period)), [period]);

  const avgEffort = (displayData.reduce((s, d) => s + d.effort, 0) / displayData.length).toFixed(1);
  const below = displayData.filter((d) => d.effort < Number(threshold)).length;
  const totalGaps = displayData.reduce((s, d) => s + d.gaps, 0);
  const daysAbove95 = displayData.filter((d) => d.effort >= 95).length;

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard title="Avg Effort" value={avgEffort} unit="%" icon={Clock} status="success" trend="neutral" trendValue={`${period}-day period`} />
          <MetricCard title="Days Below Threshold" value={String(below)} unit={`< ${threshold}%`} icon={AlertTriangle} status={below > 5 ? "warning" : "normal"} trend={below > 5 ? "up" : "neutral"} trendValue={below > 0 ? "Review outages" : "All good"} />
          <MetricCard title="Total Gaps" value={String(totalGaps)} unit="segments" icon={HardDrive} status="normal" trend="neutral" trendValue="Across period" />
          <MetricCard title="Days >= 95%" value={String(daysAbove95)} unit="days" icon={CheckCircle} status="success" trend="neutral" trendValue={`${Math.round((daysAbove95 / displayData.length) * 100)}% of period`} />
        </div>

        {/* Main chart */}
        <Card title="Daily Recording Effort" action={<span className="text-[10px] font-mono text-slate-500">{period}-day view | % of 24h recorded</span>}>
          <div className="h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickLine={false} interval={Math.floor(displayData.length / 12)} />
                <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number) => [`${v}%`, 'Effort']}
                  labelFormatter={(l) => `${l}`}
                />
                {showThreshold && <ReferenceLine y={Number(threshold)} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={{ value: `${threshold}%`, position: 'right', style: { fill: '#f59e0b', fontSize: 9 } }} />}
                <Bar dataKey="effort" radius={[2, 2, 0, 0]}>
                  {displayData.map((entry, i) => (
                    <Cell key={i} fill={entry.effort < Number(threshold) ? '#f59e0b' : entry.effort >= 95 ? '#34d399' : '#06b6d4'} fillOpacity={entry.effort < Number(threshold) ? 0.8 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px] font-mono text-slate-600">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> &gt;=95%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> &gt;={threshold}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Below threshold</span>
          </div>
        </Card>

        {/* Gap log */}
        <Card title="Notable Outages / Gaps">
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  {["Date", "Effort %", "Est. Gap (h)", "# Gaps", "Likely Cause"].map((h) => (
                    <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayData.filter((d) => d.effort < Number(threshold)).map((d) => (
                  <tr key={d.date} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-2 font-mono text-slate-300">{d.date}</td>
                    <td className="py-2 px-2 font-mono">
                      <span className={d.effort < 50 ? "text-rose-400" : "text-amber-400"}>{d.effort}%</span>
                    </td>
                    <td className="py-2 px-2 font-mono text-slate-400">{((100 - d.effort) * 0.24).toFixed(1)}h</td>
                    <td className="py-2 px-2 font-mono text-slate-400">{d.gaps}</td>
                    <td className="py-2 px-2 text-slate-500">{d.effort < 50 ? "System restart / power issue" : "Scheduled maintenance window"}</td>
                  </tr>
                ))}
                {displayData.filter((d) => d.effort < Number(threshold)).length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-slate-600">No outages below threshold in this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Context */}
        <Card title="Why Recording Effort Matters">
          <p className="text-xs text-slate-500 mt-1">
            Recording effort is the percentage of each 24-hour day for which valid acoustic data exists. Days with low effort may produce unreliable event counts, biased spectral averages, or misleading soundscape heatmaps. All other hydrophone pages should be interpreted in the context of recording effort — low-effort days are visually flagged across the suite.
          </p>
        </Card>
      </div>

      <SettingsRail>
        <SettingsGroup label="Period">
          <SettingsSelect label="" value={period} onChange={setPeriod} options={[
            { value: "30", label: "Last 30 days" },
            { value: "60", label: "Last 60 days" },
          ]} />
        </SettingsGroup>
        <SettingsGroup label="Threshold">
          <SettingsSelect label="Usable data %" value={threshold} onChange={setThreshold} options={[
            { value: "70", label: "70%" },
            { value: "80", label: "80% (default)" },
            { value: "90", label: "90%" },
          ]} />
        </SettingsGroup>
        <SettingsGroup label="Display">
          <SettingsToggle label="Show threshold line" checked={showThreshold} onChange={setShowThreshold} />
        </SettingsGroup>
      </SettingsRail>
    </div>
  );
}
