import { Card } from "../../components/Card";
import { generateSpectralDensityData } from "../../components/hydrophone/shared";
import { SettingsRail, SettingsGroup, SettingsToggle, SettingsSelect } from "../../components/hydrophone/SettingsRail";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, Area, AreaChart, ReferenceLine } from "recharts";
import { Download } from "lucide-react";
import { getActiveNodeLabel } from "../../lib/demoMode";

const spectralData = generateSpectralDensityData();

export function SpectralDensities() {
  const [showL05, setShowL05] = useState(true);
  const [showL50, setShowL50] = useState(true);
  const [showL95, setShowL95] = useState(true);
  const [showLeq, setShowLeq] = useState(true);
  const [showDensityFill, setShowDensityFill] = useState(true);
  const [period, setPeriod] = useState("month");

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="text-slate-500">
            <span className="text-slate-300">{getActiveNodeLabel()}</span> | Period: <span className="text-slate-300">{period === "month" ? "Feb 17 - Mar 17 2026" : "Mar 10 - Mar 17 2026"}</span> | H1-Omni 48kHz
          </div>
          <button className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors">
            <Download size={13} /> Export
          </button>
        </div>

        {/* Main PSD Chart */}
        <Card title="Power Spectral Density Distribution" action={<span className="text-[10px] font-mono text-slate-500">dB re 1µPa²/Hz</span>}>
          <div className="h-96 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spectralData} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                <defs>
                  <linearGradient id="densityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
                <XAxis
                  dataKey="freqLabel"
                  tick={{ fill: '#475569', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                  label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -2, style: { fill: '#475569', fontSize: 10 } }}
                />
                <YAxis
                  domain={[30, 130]}
                  tick={{ fill: '#475569', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'PSD (dB re 1µPa²/Hz)', angle: -90, position: 'insideLeft', offset: 15, style: { fill: '#475569', fontSize: 10 } }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number, name: string) => [`${v.toFixed(1)} dB`, name]}
                />
                <Legend iconType="line" wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />

                {showDensityFill && showL05 && showL95 && (
                  <Area type="monotone" dataKey="l05" stroke="none" fill="url(#densityFill)" name="L05-L95 range" />
                )}
                {showL05 && <Line type="monotone" dataKey="l05" stroke="#475569" strokeWidth={1} strokeDasharray="4 2" dot={false} name="L05 (5th %ile)" />}
                {showL50 && <Line type="monotone" dataKey="l50" stroke="#06b6d4" strokeWidth={2} dot={false} name="L50 (median)" />}
                {showL95 && <Line type="monotone" dataKey="l95" stroke="#475569" strokeWidth={1} strokeDasharray="4 2" dot={false} name="L95 (95th %ile)" />}
                {showLeq && <Line type="monotone" dataKey="leq" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Leq (avg)" />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Explanation */}
        <Card title="About This Chart">
          <div className="text-xs text-slate-400 space-y-2 mt-1">
            <p>This chart shows the statistical distribution of underwater acoustic energy across frequency for the selected period. It is a standard tool for soundscape characterisation and instrumentation review.</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-slate-800/40 rounded p-3 border border-slate-800">
                <div className="text-[10px] font-mono text-cyan-400 mb-1">L50 (Median)</div>
                <p className="text-slate-500">The 50th percentile—half of all measurements fall above and below this line. Represents the typical soundscape.</p>
              </div>
              <div className="bg-slate-800/40 rounded p-3 border border-slate-800">
                <div className="text-[10px] font-mono text-amber-400 mb-1">Leq (Equivalent Average)</div>
                <p className="text-slate-500">The energy-equivalent continuous level. Weighted by acoustic power, so elevated by loud transient events.</p>
              </div>
              <div className="bg-slate-800/40 rounded p-3 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 mb-1">L05 (5th percentile)</div>
                <p className="text-slate-500">Upper bound—only 5% of measurements exceed this. Indicates the loudest conditions.</p>
              </div>
              <div className="bg-slate-800/40 rounded p-3 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 mb-1">L95 (95th percentile)</div>
                <p className="text-slate-500">Lower bound—95% of measurements exceed this. Represents the quietest ambient conditions.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Settings */}
      <SettingsRail>
        <SettingsGroup label="Period">
          <SettingsSelect label="" value={period} onChange={setPeriod} options={[
            { value: "week", label: "Last 7 days" },
            { value: "month", label: "Last 30 days" },
          ]} />
        </SettingsGroup>
        <SettingsGroup label="Percentile Curves">
          <SettingsToggle label="L05 (5th %ile)" checked={showL05} onChange={setShowL05} />
          <SettingsToggle label="L50 (median)" checked={showL50} onChange={setShowL50} />
          <SettingsToggle label="L95 (95th %ile)" checked={showL95} onChange={setShowL95} />
          <SettingsToggle label="Leq (average)" checked={showLeq} onChange={setShowLeq} />
        </SettingsGroup>
        <SettingsGroup label="Display">
          <SettingsToggle label="Show density fill" checked={showDensityFill} onChange={setShowDensityFill} />
        </SettingsGroup>
      </SettingsRail>
    </div>
  );
}
