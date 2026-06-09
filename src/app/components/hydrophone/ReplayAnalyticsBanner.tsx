export function ReplayAnalyticsBanner() {
  return (
    <div
      className="rounded-lg border px-4 py-2 text-xs dash-text-secondary"
      style={{ borderColor: "var(--dash-warning)", backgroundColor: "var(--dash-warning-bg)", color: "var(--dash-badge-replay-text)" }}
    >
      <strong>Brighton Marina replay analytics</strong> · prototype post-processing · not live onboard ML
    </div>
  );
}
