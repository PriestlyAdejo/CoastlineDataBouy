import { Card } from "../../components/Card";
import { EVENT_CLASSES, generateDailyEventData } from "../../components/hydrophone/shared";
import { SettingsRail, SettingsGroup, SettingsToggle, SettingsSelect } from "../../components/hydrophone/SettingsRail";
import { useState, useMemo } from "react";
import { clsx } from "clsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, Area, AreaChart } from "recharts";
import { Download } from "lucide-react";
import { isBrightonDemo } from "../../lib/demoMode";

const allData = generateDailyEventData(30);

export function DailyEvents() {
  const [smoothing, setSmoothing] = useState("none");
  const [showGaps, setShowGaps] = useState(true);
  const [chartType, setChartType] = useState("stacked");
  const [enabledClasses, setEnabledClasses] = useState<Record<string, boolean>>({
    vessel: true, wave: true, rain: true, port: true, transient: true, unknown: true,
  });

  const data = useMemo(() => {
    if (smoothing === "none") return allData;
    const window = smoothing === "3day" ? 3 : 7;
    return allData.map((d, i) => {
      const slice = allData.slice(Math.max(0, i - window + 1), i + 1);
      const avg = (key: string) => Math.round(slice.reduce((s, x) => s + (x as any)[key], 0) / slice.length);
      return { ...d, vessel: avg("vessel"), wave: avg("wave"), rain: avg("rain"), port: avg("port"), transient: avg("transient"), unknown: avg("unknown") };
    });
  }, [smoothing]);

  const activeClasses = EVENT_CLASSES.filter((c) => c.status === "active");
  const totalEvents = data.reduce((s, d) => s + d.vessel + d.wave + d.rain + d.port + d.transient + d.unknown, 0);
  const lowEffortDays = allData.filter((d) => d.lowEffort).length;

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* Summary strip */}
        <div className="flex items-center gap-6 text-xs font-mono">
          <div><span className="text-slate-500">Period:</span> <span className="text-slate-300">{isBrightonDemo() ? "1 May 2026 (field test)" : "16 Feb - 17 Mar 2026"}</span></div>
          <div><span className="text-slate-500">Total Events:</span> <span className="text-cyan-400">{totalEvents}</span></div>
          <div><span className="text-slate-500">Low-effort Days:</span> <span className={lowEffortDays > 0 ? "text-amber-400" : "text-emerald-400"}>{lowEffortDays}</span></div>
          <div className="ml-auto">
            <button className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors">
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* Main chart */}
        <Card title="Daily Event Detections" action={<span className="text-[10px] font-mono text-slate-500">{smoothing === "none" ? "Raw counts" : `${smoothing} smoothing`}</span>}>
          <div className="h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "stacked" ? (
                <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                  {activeClasses.map((cls) =>
                    enabledClasses[cls.id] && (
                      <Bar key={cls.id} dataKey={cls.id} name={cls.label} stackId="a" fill={cls.color}
                        radius={cls.id === "unknown" ? [2, 2, 0, 0] : undefined}
                      />
                    )
                  )}
                </BarChart>
              ) : (
                <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                  {activeClasses.map((cls) =>
                    enabledClasses[cls.id] && (
                      <Area key={cls.id} dataKey={cls.id} name={cls.label} stackId="a" fill={cls.color} fillOpacity={0.3} stroke={cls.color} strokeWidth={1.5} />
                    )
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          {/* Low effort day indicators */}
          {showGaps && (
            <div className="flex gap-0.5 mt-2 px-1">
              {allData.map((d) => (
                <div
                  key={d.date}
                  className={clsx("flex-1 h-1.5 rounded-full", d.lowEffort ? "bg-amber-500/40" : "bg-slate-800")}
                  title={`${d.date}: ${d.effort}% effort`}
                />
              ))}
            </div>
          )}
          <div className="text-[10px] font-mono text-slate-600 mt-2">
            {showGaps && <span className="text-amber-500/60">Amber bars = recording effort {"<"} 80%</span>}
          </div>
        </Card>

        {/* Per-class breakdown table */}
        <Card title="Event Class Breakdown">
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left py-2 px-2 font-medium">Class</th>
                  <th className="text-right py-2 px-2 font-medium">Total</th>
                  <th className="text-right py-2 px-2 font-medium">Avg/Day</th>
                  <th className="text-right py-2 px-2 font-medium">Peak Day</th>
                  <th className="text-right py-2 px-2 font-medium">% Share</th>
                </tr>
              </thead>
              <tbody>
                {activeClasses.map((cls) => {
                  const vals = allData.map((d) => (d as any)[cls.id] as number);
                  const total = vals.reduce((s, v) => s + v, 0);
                  const avg = (total / allData.length).toFixed(1);
                  const peak = Math.max(...vals);
                  const pct = totalEvents > 0 ? ((total / totalEvents) * 100).toFixed(1) : "0";
                  return (
                    <tr key={cls.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cls.color }} />
                        <span className="text-slate-300">{cls.label}</span>
                      </td>
                      <td className="text-right py-2 px-2 font-mono text-slate-300">{total}</td>
                      <td className="text-right py-2 px-2 font-mono text-slate-400">{avg}</td>
                      <td className="text-right py-2 px-2 font-mono text-slate-400">{peak}</td>
                      <td className="text-right py-2 px-2 font-mono text-cyan-400">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Settings Rail */}
      <SettingsRail>
        <SettingsGroup label="Chart Type">
          <SettingsSelect label="" value={chartType} onChange={setChartType} options={[
            { value: "stacked", label: "Stacked Bar" },
            { value: "area", label: "Stacked Area" },
          ]} />
        </SettingsGroup>
        <SettingsGroup label="Smoothing">
          <SettingsSelect label="" value={smoothing} onChange={setSmoothing} options={[
            { value: "none", label: "None (raw)" },
            { value: "3day", label: "3-day moving avg" },
            { value: "7day", label: "7-day moving avg" },
          ]} />
        </SettingsGroup>
        <SettingsGroup label="Event Classes">
          {activeClasses.map((cls) => (
            <SettingsToggle key={cls.id} label={cls.label} checked={enabledClasses[cls.id] ?? true}
              onChange={(v) => setEnabledClasses((s) => ({ ...s, [cls.id]: v }))}
            />
          ))}
        </SettingsGroup>
        <SettingsGroup label="Display">
          <SettingsToggle label="Show recording gaps" checked={showGaps} onChange={setShowGaps} />
        </SettingsGroup>
      </SettingsRail>
    </div>
  );
}
