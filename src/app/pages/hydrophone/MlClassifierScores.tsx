import { Card } from "../../components/Card";
import { EVENT_CLASSES, CLASSIFIER_STATUS_STYLES } from "../../components/hydrophone/shared";
import { isBrightonDemo } from "../../lib/demoMode";
import { ReplayAnalyticsBanner } from "../../components/hydrophone/ReplayAnalyticsBanner";
import { FutureAnalysisPlaceholder } from "../../components/hydrophone/FutureAnalysisPlaceholder";
import { clsx } from "clsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { cartesianGridProps, xAxisProps, yAxisProps, chartTooltipStyle } from "../../lib/chartTheme";

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export function MlClassifierScores() {
  if (!isBrightonDemo()) {
    return <FutureAnalysisPlaceholder title="ML classifier scores" />;
  }

  const scores = EVENT_CLASSES.map((cls, i) => ({
    name: cls.label.split(" ")[0],
    score: Math.round((0.35 + seededRandom(i * 19) * 0.55) * 100),
    status: cls.status,
  }));

  const grid = cartesianGridProps();
  const tip = chartTooltipStyle();

  return (
    <div className="flex flex-col gap-4">
      <ReplayAnalyticsBanner />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Replay analytics / prototype model output">
          <p className="text-xs dash-text-secondary mb-3">
            Classifier scores from offline replay pipeline. Not running on Pi live.
          </p>
          <div className="space-y-2">
            {EVENT_CLASSES.map((cls, i) => {
              const style = CLASSIFIER_STATUS_STYLES[cls.status];
              const score = scores[i]?.score ?? 0;
              return (
                <div key={cls.id} className="flex items-center justify-between p-2 rounded-md border gap-2" style={{ borderColor: "var(--dash-panel-border)" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cls.color }} />
                    <span className="text-xs dash-text-primary truncate">{cls.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono dash-text-primary">{score}%</span>
                    <span className={clsx("text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border", style.bg, style.text, style.border)}>
                      {style.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Score distribution (replay)">
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scores} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid {...grid} />
                <XAxis {...xAxisProps({ dataKey: "name" })} />
                <YAxis {...yAxisProps({ domain: [0, 100] })} />
                <Tooltip {...tip} />
                <Bar dataKey="score" fill="var(--dash-accent)" name="Score %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
