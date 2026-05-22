export type CalibrationStatus = "calibrated" | "uncalibrated" | string;

export function formatSplDisplay(
  value: number | null | undefined,
  calibrationStatus: CalibrationStatus | null | undefined,
  opts?: { replayLabel?: string },
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const n = value.toFixed(1);
  if (calibrationStatus === "calibrated") return `${n} dB re 1 µPa`;
  if (opts?.replayLabel) return `${n} dB (${opts.replayLabel})`;
  return `${n} dB rel.`;
}

export function splUnitLabel(calibrationStatus: CalibrationStatus | null | undefined): string {
  return calibrationStatus === "calibrated" ? "dB re 1 µPa" : "dB rel.";
}

export function isCalibratedSpl(calibrationStatus: CalibrationStatus | null | undefined): boolean {
  return calibrationStatus === "calibrated";
}

export function gainNoteLabel(note: string | null | undefined): string | null {
  if (!note || !note.trim()) return null;
  return note.trim();
}
