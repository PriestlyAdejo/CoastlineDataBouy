/** User-facing labels for replay/demo UI (provenance stays in data model). */

export function syncStatusLabel(opts: {
  useApi: boolean;
  paused: boolean;
}): string {
  if (opts.paused) return "Replay paused";
  return opts.useApi ? "Live data" : "Replay data";
}

export function acousticLevelLabel(value: number | null, calibrated: boolean): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const n = value.toFixed(1);
  return calibrated ? `${n} dB re 1 µPa` : `${n} dB rel.`;
}

export function acousticUnitLabel(calibrated: boolean): string {
  return calibrated ? "dB re 1 µPa" : "dB rel.";
}

export function storageLabel(usedGb: number, totalGb: number): string {
  return `${usedGb.toFixed(1)} / ${totalGb.toFixed(0)} GB`;
}

export function lastUpdateLabel(): string {
  return "Updated live";
}

export function fileStatusLabel(status: string): string {
  const map: Record<string, string> = {
    uploaded: "Uploaded",
    pending: "Pending",
    indexed: "Indexed",
    replay_metadata_only: "Indexed",
    not_uploaded_yet: "Pending",
    replay_export: "Available",
  };
  return map[status] ?? status;
}

export function phaseBadgeClass(colour: string): { borderColor: string; color: string } {
  return { borderColor: colour, color: colour };
}
