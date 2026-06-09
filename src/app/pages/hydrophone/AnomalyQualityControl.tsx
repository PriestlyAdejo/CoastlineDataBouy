import { Card } from "../../components/Card";
import { MetricCard } from "../../components/Widgets";
import { generateQualityMetrics } from "../../components/hydrophone/shared";
import { isBrightonDemo } from "../../lib/demoMode";
import { useDeploymentView } from "../../hooks/useDeploymentView";
import { ReplayAnalyticsBanner } from "../../components/hydrophone/ReplayAnalyticsBanner";
import { FutureAnalysisPlaceholder } from "../../components/hydrophone/FutureAnalysisPlaceholder";
import { Shield, AlertTriangle, Activity, HardDrive } from "lucide-react";

export function AnomalyQualityControl() {
  const vm = useDeploymentView();
  if (!isBrightonDemo()) {
    return <FutureAnalysisPlaceholder title="Anomaly / quality control" />;
  }

  const metrics = generateQualityMetrics();

  return (
    <div className="flex flex-col gap-4">
      <ReplayAnalyticsBanner />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard title="Recording effort" value={String(vm?.acoustic?.recordingEffortPct ?? "—")} unit="%" trend="neutral" trendValue="Replay session" icon={Activity} status="success" />
        <MetricCard title="Storage free" value={vm ? vm.storage.freeGb.toFixed(1) : "—"} unit="GB" trend="neutral" trendValue="Replay buoy SSD" icon={HardDrive} status="normal" />
        <MetricCard title="QC status" value="Pass" unit="" trend="neutral" trendValue="Prototype QC pipeline" icon={Shield} status="success" />
      </div>
      <Card title="Quality control metrics">
        <p className="text-xs dash-text-secondary mb-4">
          Clipping, gaps, noise floor, and file health from Brighton replay post-processing.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: "var(--dash-panel-border)" }}>
              <AlertTriangle size={16} className={m.status === "warning" ? "text-[var(--dash-warning)]" : "text-[var(--dash-accent)]"} />
              <div className="min-w-0">
                <div className="text-xs font-semibold dash-text-primary">{m.label}</div>
                <div className="text-lg font-mono dash-text-primary">{m.value}</div>
                <div className="text-[10px] dash-text-faint mt-1">{m.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
