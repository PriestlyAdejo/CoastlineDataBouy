import { Card } from "../../components/Card";
import { isBrightonDemo } from "../../lib/demoMode";
import { generateWaveformEnvelope } from "../../components/hydrophone/shared";
import { ReplayAnalyticsBanner } from "../../components/hydrophone/ReplayAnalyticsBanner";
import { FutureAnalysisPlaceholder } from "../../components/hydrophone/FutureAnalysisPlaceholder";
import { Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Line, ComposedChart } from "recharts";
import { cartesianGridProps, xAxisProps, yAxisProps, chartTooltipStyle } from "../../lib/chartTheme";

export function WaveformPreview() {
  if (!isBrightonDemo()) {
    return <FutureAnalysisPlaceholder title="Waveform preview" />;
  }

  const data = generateWaveformEnvelope(240);
  const grid = cartesianGridProps();
  const tip = chartTooltipStyle();

  return (
    <div className="flex flex-col gap-4">
      <ReplayAnalyticsBanner />
      <Card
        title="Waveform preview (replay-derived)"
        action={<span className="text-[10px] font-mono dash-text-faint">Amplitude envelope · dBFS relative</span>}
      >
        <p className="text-xs dash-text-secondary mb-3">
          Replay-derived visualization from Brighton Marina dataset. Not a live waveform stream.
        </p>
        <div className="h-64 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid {...grid} />
              <XAxis {...xAxisProps({ dataKey: "time", interval: 23 })} />
              <YAxis {...yAxisProps({ domain: [-1, 1] })} />
              <Tooltip {...tip} />
              <Area type="monotone" dataKey="envelope" fill="var(--dash-accent-bg)" stroke="var(--dash-accent)" strokeWidth={1} dot={false} name="Envelope" />
              <Line type="monotone" dataKey="amp" stroke="var(--dash-warning)" strokeWidth={1} dot={false} name="Amplitude" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
