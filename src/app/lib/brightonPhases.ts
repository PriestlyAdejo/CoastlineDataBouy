export type BrightonPhaseDef = {
  id: string;
  label: string;
  start: string;
  end: string;
  colour: string;
  description: string;
};

/** Field-test timeline — local Europe/London (BST, UTC+1 on 2026-05-01). */
export const BRIGHTON_PHASES: BrightonPhaseDef[] = [
  { id: "pre_record", label: "PRE", start: "2026-05-01T00:00:00+01:00", end: "2026-05-01T12:37:00+01:00", colour: "lightgrey", description: "Pre-record before field movement." },
  { id: "on_land", label: "LAND", start: "2026-05-01T12:37:00+01:00", end: "2026-05-01T12:38:00+01:00", colour: "tan", description: "Buoy on land." },
  { id: "on_boat_pre", label: "ON-BOAT", start: "2026-05-01T12:38:00+01:00", end: "2026-05-01T12:57:00+01:00", colour: "lightsteelblue", description: "On boat before deployment." },
  { id: "free_floating", label: "FREE-FLOATING", start: "2026-05-01T12:57:00+01:00", end: "2026-05-01T13:11:00+01:00", colour: "skyblue", description: "Free-floating at test point." },
  { id: "on_boat_mid", label: "BOAT", start: "2026-05-01T13:11:00+01:00", end: "2026-05-01T13:14:00+01:00", colour: "lightsteelblue", description: "On boat mid-test." },
  { id: "anchored_quiet", label: "ANCHORED", start: "2026-05-01T13:14:00+01:00", end: "2026-05-01T13:17:00+01:00", colour: "lightgreen", description: "Moored quiet." },
  { id: "anchored_disturbed", label: "BOAT CIRCLING BUOY", start: "2026-05-01T13:17:00+01:00", end: "2026-05-01T13:36:00+01:00", colour: "salmon", description: "Boat circling buoy." },
  { id: "post_test", label: "ON-BOAT", start: "2026-05-01T13:36:00+01:00", end: "2026-05-01T13:53:00+01:00", colour: "lightsteelblue", description: "Post-test recovery." },
  { id: "after_test", label: "DOCK", start: "2026-05-01T13:53:00+01:00", end: "2026-05-01T23:59:59+01:00", colour: "lightgrey", description: "Dock/static after test." },
];

export const TEST_DAY_START = "2026-05-01T00:00:00+01:00";
export const TEST_DAY_END = "2026-05-01T23:59:59+01:00";

export function parseReplayMs(iso: string): number {
  return new Date(iso).getTime();
}

export function phaseAtTime(ms: number): BrightonPhaseDef {
  for (const p of BRIGHTON_PHASES) {
    const s = parseReplayMs(p.start);
    const e = parseReplayMs(p.end);
    if (ms >= s && ms < e) return p;
  }
  return BRIGHTON_PHASES[BRIGHTON_PHASES.length - 1];
}

export function phaseById(id: string): BrightonPhaseDef | undefined {
  return BRIGHTON_PHASES.find((p) => p.id === id);
}

export function formatBstLabel(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms)) + " BST";
}

export function formatBstDateTime(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}
