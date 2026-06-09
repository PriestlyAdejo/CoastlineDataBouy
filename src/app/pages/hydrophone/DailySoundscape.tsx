import { Card } from "../../components/Card";
import { generateHourlySpectrogramData } from "../../components/hydrophone/shared";
import { SettingsRail, SettingsGroup, SettingsToggle, SettingsSelect } from "../../components/hydrophone/SettingsRail";
import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { isBrightonDemo } from "../../lib/demoMode";
import { FutureAnalysisPlaceholder } from "../../components/hydrophone/FutureAnalysisPlaceholder";

const spectrogramData = generateHourlySpectrogramData();

// Color scale: deep blue -> cyan -> amber -> red
function intensityToColor(val: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
  if (t < 0.25) {
    const s = t / 0.25;
    return `rgb(${Math.round(15 + s * 10)}, ${Math.round(23 + s * 20)}, ${Math.round(42 + s * 60)})`;
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return `rgb(${Math.round(25 * (1 - s))}, ${Math.round(100 + s * 82)}, ${Math.round(102 + s * 110)})`;
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return `rgb(${Math.round(s * 245)}, ${Math.round(182 - s * 24)}, ${Math.round(212 * (1 - s))})`;
  } else {
    const s = (t - 0.75) / 0.25;
    return `rgb(${Math.round(245 - s * 6)}, ${Math.round(158 * (1 - s * 0.7))}, ${Math.round(s * 20)})`;
  }
}

const freqLabels = ["24k", "20k", "16k", "12k", "10k", "8k", "6k", "4k", "3k", "2k", "1.5k", "1k", "800", "600", "400", "300", "200", "150", "100", "80", "60", "50", "40", "30", "25", "20", "16", "12", "10", "8", "6", "4"];

export function DailySoundscape() {
  if (!isBrightonDemo()) return <FutureAnalysisPlaceholder title="Daily soundscape" />;
  const [dayOffset, setDayOffset] = useState(0);
  const [colorMap, setColorMap] = useState("viridis");
  const [showEvents, setShowEvents] = useState(true);
  const [freqScale, setFreqScale] = useState("log");
  const [hoveredCell, setHoveredCell] = useState<{ hour: number; freq: string; val: number } | null>(null);

  const currentDate = useMemo(() => {
    const d = new Date(2026, 2, 17);
    d.setDate(d.getDate() - dayOffset);
    return d;
  }, [dayOffset]);

  const dateStr = currentDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* Date browser */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setDayOffset(dayOffset + 1)} className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-semibold text-slate-200 font-mono min-w-[200px] text-center">{dateStr}</span>
            <button disabled={dayOffset === 0} onClick={() => setDayOffset(dayOffset - 1)} className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
          <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors">
            <Download size={13} /> Export Figure
          </button>
        </div>

        {/* Heatmap */}
        <Card title="24-Hour Soundscape" action={<span className="text-[10px] font-mono text-slate-500">PSD proxy (dB re 1µPa²/Hz)</span>}>
          <div className="mt-3 relative">
            {/* Tooltip */}
            {hoveredCell && (
              <div className="absolute top-0 right-0 z-20 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-mono shadow-xl">
                <div className="text-slate-300">{String(hoveredCell.hour).padStart(2, '0')}:00 UTC | {hoveredCell.freq} Hz</div>
                <div className="text-cyan-400">{hoveredCell.val} dB</div>
              </div>
            )}
            
            <div className="flex">
              {/* Y-axis labels */}
              <div className="w-12 flex flex-col justify-between py-0.5 shrink-0">
                {[0, 8, 16, 24, 31].map((i) => (
                  <span key={i} className="text-[9px] font-mono text-slate-500 text-right pr-2">{freqLabels[Math.min(i, freqLabels.length - 1)]}</span>
                ))}
              </div>
              
              {/* Heatmap grid */}
              <div className="flex-1 flex flex-col gap-px">
                {spectrogramData.map((row, fi) => (
                  <div key={fi} className="flex gap-px h-3">
                    {row.map((val, hi) => (
                      <div
                        key={hi}
                        className="flex-1 rounded-[1px] cursor-crosshair transition-opacity hover:opacity-80"
                        style={{ backgroundColor: intensityToColor(val, 40, 120) }}
                        onMouseEnter={() => setHoveredCell({ hour: hi, freq: freqLabels[fi] || '', val })}
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* X-axis labels */}
            <div className="flex ml-12 mt-1">
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="flex-1 text-center">
                  {h % 3 === 0 && <span className="text-[9px] font-mono text-slate-500">{String(h).padStart(2, '0')}</span>}
                </div>
              ))}
            </div>
            <div className="text-center text-[9px] font-mono text-slate-600 mt-0.5">Hour (UTC)</div>
          </div>

          {/* Color scale legend */}
          <div className="flex items-center gap-3 mt-4">
            <span className="text-[9px] font-mono text-slate-500">Low</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden flex">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: intensityToColor(40 + (i / 40) * 80, 40, 120) }} />
              ))}
            </div>
            <span className="text-[9px] font-mono text-slate-500">High</span>
            <span className="text-[9px] font-mono text-slate-600 ml-2">dB re 1µPa²/Hz</span>
          </div>

          {/* Event markers overlay indicator */}
          {showEvents && (
            <div className="mt-3 flex gap-2 text-[10px] font-mono">
              <span className="text-slate-500">Notable:</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">Vessel 06:30-08:45</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">Surf dominant 10:00-15:00</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">Gap 03:12-03:18</span>
            </div>
          )}
        </Card>

        {/* Interpretation */}
        <Card title="Soundscape Interpretation">
          <div className="text-xs text-slate-400 space-y-2 mt-1">
            <p>The daily soundscape shows typical coastal patterns for this deployment site. Low-frequency energy peaks during morning (06:00-09:00) and evening (16:00-19:00) periods correlate with vessel traffic in the nearby shipping lane.</p>
            <p>Mid-frequency energy remains elevated throughout daylight hours, consistent with wave/surf dominance during moderate sea states. A brief recording gap at 03:12 UTC lasted approximately 6 minutes.</p>
            <p className="text-slate-500 italic">This visualization shows power spectral density averaged per hour-frequency bin. Useful for interpreting vessel/wave/weather patterns at a glance.</p>
          </div>
        </Card>
      </div>

      {/* Settings */}
      <SettingsRail>
        <SettingsGroup label="Frequency Axis">
          <SettingsSelect label="" value={freqScale} onChange={setFreqScale} options={[
            { value: "log", label: "Logarithmic" },
            { value: "linear", label: "Linear" },
          ]} />
        </SettingsGroup>
        <SettingsGroup label="Colour Map">
          <SettingsSelect label="" value={colorMap} onChange={setColorMap} options={[
            { value: "viridis", label: "Viridis (default)" },
            { value: "thermal", label: "Thermal" },
            { value: "grayscale", label: "Grayscale" },
          ]} />
        </SettingsGroup>
        <SettingsGroup label="Overlays">
          <SettingsToggle label="Show event markers" checked={showEvents} onChange={setShowEvents} />
        </SettingsGroup>
      </SettingsRail>
    </div>
  );
}
