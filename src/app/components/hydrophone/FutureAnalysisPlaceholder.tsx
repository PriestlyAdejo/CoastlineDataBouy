import { Card } from "../Card";
import { Layers } from "lucide-react";

export function FutureAnalysisPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--dash-warning)", backgroundColor: "var(--dash-warning-bg)", color: "var(--dash-warning)" }}>
        Future analysis placeholder — not implemented. Current hydrophone operation is local SSD WAV recording with metadata upload only.
      </div>
      <Card title={title}>
        <div className="flex flex-col items-center justify-center py-16 gap-3 dash-text-secondary">
          <Layers size={32} className="opacity-60" />
          <p className="text-sm text-center max-w-md">
            This view is reserved for future acoustic analytics (classification, soundscape metrics, spectral analysis).
            Use the Summary tab to inspect raw recording chunks and metadata.
          </p>
        </div>
      </Card>
    </div>
  );
}
