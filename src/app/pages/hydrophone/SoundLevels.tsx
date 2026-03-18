import { Card } from "../../components/Card";
import { FREQUENCY_BANDS, generateSoundLevelData } from "../../components/hydrophone/shared";
import { SettingsRail, SettingsGroup, SettingsToggle, SettingsSelect } from "../../components/hydrophone/SettingsRail";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, ReferenceArea } from "recharts";
import { Download } from "lucide-react";

const data = generateSoundLevelData(30);

const bandColors: Record<string, string> = {
  vlf: "#f59e0b",
  lf: "#06b6d4",
  mf: "#8b5cf6",
  hf: "#34d399",
  broadband: "#ef4444",
};

export function SoundLevels() {
  const [enabledBands, setEnabledBands] = useState<Record<string, boolean>>({
    vlf: true, lf: true, mf: true, hf: false, broadband: true,
  });
  const [smoothing, setSmoothing] = useState("none");
  const [metric, setMetric] = useState("rms");

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="text-slate-500">
            Sound Pressure Level | <span className="text-slate-300">RMS daily averages</span> | dB re 1µPa
          </div>
          <button className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors">
            <Download size={13} /> Export
          </button>
        </div>

        <Card title="Sound Levels Over Time" action={<span className="text-[10px] font-mono text-slate-500">30-day view</span>}>
          <div className="h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis domain={[40, 120]} tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false}
                  label={{ value: 'SPL (dB re 1µPa)', angle: -90, position: 'insideLeft', offset: 15, style: { fill: '#475569', fontSize: 10 } }}
                />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number, name: string) => [`${v.toFixed(1)} dB`, name]}
                />
                <Legend iconType="line" wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                {FREQUENCY_BANDS.map((band) =>
                  enabledBands[band.id] && (
                    <Line key={band.id} type="monotone" dataKey={band.id} name={band.label} stroke={bandColors[band.id]} strokeWidth={band.id === "broadband" ? 2 : 1.5} dot={false} />
                  )
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Band explanation */}
        <Card title="Frequency Band Guide">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {FREQUENCY_BANDS.map((band) => (
              <div key={band.id} className="bg-slate-800/40 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bandColors[band.id] }} />
                  <span className="text-xs font-semibold text-slate-200">{band.label}</span>
                </div>
                <p className="text-[10px] text-slate-500">{band.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Summary stats table */}
        <Card title="Band Statistics (30-day)">
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  {["Band", "Min dB", "Mean dB", "Max dB", "Std Dev", "Trend"].map((h) => (
                    <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FREQUENCY_BANDS.map((band) => {
                  const vals = data.map((d) => (d as any)[band.id] as number);
                  const min = Math.min(...vals).toFixed(1);
                  const max = Math.max(...vals).toFixed(1);
                  const mean = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
                  const std = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - Number(mean), 2), 0) / vals.length).toFixed(1);
                  const trend = vals[vals.length - 1] > vals[0] ? "Rising" : vals[vals.length - 1] < vals[0] ? "Falling" : "Stable";
                  return (
                    <tr key={band.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bandColors[band.id] }} />
                        <span className="text-slate-300">{band.label}</span>
                      </td>
                      <td className="py-2 px-2 font-mono text-slate-400">{min}</td>
                      <td className="py-2 px-2 font-mono text-slate-300">{mean}</td>
                      <td className="py-2 px-2 font-mono text-slate-400">{max}</td>
                      <td className="py-2 px-2 font-mono text-slate-500">{std}</td>
                      <td className="py-2 px-2 font-mono text-xs">
                        <span className={trend === "Rising" ? "text-amber-400" : trend === "Falling" ? "text-cyan-400" : "text-slate-500"}>{trend}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <SettingsRail>
        <SettingsGroup label="Frequency Bands">
          {FREQUENCY_BANDS.map((band) => (
            <SettingsToggle key={band.id} label={band.label} checked={enabledBands[band.id] ?? false}
              onChange={(v) => setEnabledBands((s) => ({ ...s, [band.id]: v }))}
            />
          ))}
        </SettingsGroup>
        <SettingsGroup label="Metric">
          <SettingsSelect label="" value={metric} onChange={setMetric} options={[
            { value: "rms", label: "RMS (Leq)" },
            { value: "peak", label: "Peak" },
            { value: "sel", label: "SEL" },
          ]} />
        </SettingsGroup>
        <SettingsGroup label="Smoothing">
          <SettingsSelect label="" value={smoothing} onChange={setSmoothing} options={[
            { value: "none", label: "None" },
            { value: "3day", label: "3-day" },
            { value: "7day", label: "7-day" },
          ]} />
        </SettingsGroup>
      </SettingsRail>
    </div>
  );
}
