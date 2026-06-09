import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/Widgets";
import { generateVesselCandidates } from "../../components/hydrophone/shared";
import { isBrightonDemo } from "../../lib/demoMode";
import { ReplayAnalyticsBanner } from "../../components/hydrophone/ReplayAnalyticsBanner";
import { FutureAnalysisPlaceholder } from "../../components/hydrophone/FutureAnalysisPlaceholder";

export function VesselMechanicalCandidates() {
  if (!isBrightonDemo()) {
    return <FutureAnalysisPlaceholder title="Vessel / mechanical noise candidates" />;
  }

  const candidates = generateVesselCandidates(14);

  return (
    <div className="flex flex-col gap-4">
      <ReplayAnalyticsBanner />
      <Card
        title="Vessel / mechanical noise candidates"
        action={<span className="text-[10px] font-mono dash-text-faint">Prototype classifier · replay inference</span>}
      >
        <p className="text-xs dash-text-secondary mb-4">
          Candidate signatures from Brighton replay post-processing. Not confirmed live vessel detections.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="dash-text-faint border-b" style={{ borderColor: "var(--dash-panel-border)" }}>
                <th className="text-left py-2 pr-3">ID</th>
                <th className="text-left py-2 pr-3">Timestamp</th>
                <th className="text-left py-2 pr-3">Candidate type</th>
                <th className="text-left py-2 pr-3">Band</th>
                <th className="text-left py-2 pr-3">Score</th>
                <th className="text-left py-2 pr-3">Confidence</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-b" style={{ borderColor: "var(--dash-panel-border)" }}>
                  <td className="py-2 pr-3 dash-text-primary">{c.id}</td>
                  <td className="py-2 pr-3 dash-text-secondary whitespace-nowrap">{new Date(c.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2 pr-3 dash-text-secondary">{c.label}</td>
                  <td className="py-2 pr-3 dash-text-faint">{c.band}</td>
                  <td className="py-2 pr-3 dash-text-primary">{c.score.toFixed(2)}</td>
                  <td className="py-2 pr-3 dash-text-primary">{(c.confidence * 100).toFixed(0)}%</td>
                  <td className="py-2">
                    <StatusBadge status="warning">{c.prototypeStatus}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
