/** Live location display state — never Brighton/Clyde fiction in LIVE API mode. */

export type LiveLocationKind =
  | "replay"
  | "live_gnss_fix"
  | "approximate_ip_fallback"
  | "gnss_waiting_fix"
  | "no_gnss_device";

export type LocationSnapshot = {
  lat?: number | null;
  lon?: number | null;
  source?: string | null;
  quality?: string | null;
  fix_status?: string | null;
  satellites?: number | null;
  hdop?: number | null;
  reason?: string | null;
  timestamp?: string | null;
};

export type LiveLocationView = {
  kind: LiveLocationKind;
  label: string;
  location: LocationSnapshot | null;
  hasCoordinates: boolean;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Build location view from API top-level location or telemetry.gps fallback. */
export function resolveLiveLocation(
  isReplay: boolean,
  topLevel: unknown,
  telemetry: unknown,
): LiveLocationView {
  if (isReplay) {
    return { kind: "replay", label: "Brighton replay", location: null, hasCoordinates: false };
  }

  const loc = asRecord(topLevel);
  const gps = asRecord(asRecord(telemetry)?.gps);
  const merged: LocationSnapshot = {
    lat: num(loc?.lat) ?? num(gps?.lat),
    lon: num(loc?.lon) ?? num(gps?.lon),
    source: (loc?.source as string) ?? (gps?.source as string) ?? "gnss",
    quality: (loc?.quality as string) ?? (gps?.quality as string),
    fix_status: (loc?.fix_status as string) ?? (gps?.fix_status as string),
    satellites: num(loc?.satellites) ?? num(gps?.satellites),
    hdop: num(loc?.hdop) ?? num(gps?.hdop),
    reason: (loc?.reason as string) ?? (gps?.reason as string),
    timestamp: (loc?.timestamp as string) ?? (gps?.timestamp as string),
  };

  const source = merged.source ?? "gnss";
  const quality = merged.quality ?? "";

  if (source === "ip_fallback" || quality === "approximate") {
    const hasCoords = merged.lat != null && merged.lon != null;
    return {
      kind: "approximate_ip_fallback",
      label: "Approximate IP fallback",
      location: merged,
      hasCoordinates: hasCoords,
    };
  }

  if (quality === "no_device" || source === "no_device") {
    return {
      kind: "no_gnss_device",
      label: "No GNSS device detected",
      location: merged,
      hasCoordinates: false,
    };
  }

  const hasCoords =
    merged.lat != null && merged.lon != null && quality !== "no_fix";

  if (hasCoords && (quality === "fix" || quality === "")) {
    return {
      kind: "live_gnss_fix",
      label: "Live GNSS fix",
      location: merged,
      hasCoordinates: true,
    };
  }

  return {
    kind: "gnss_waiting_fix",
    label: "GNSS present, waiting for fix",
    location: merged,
    hasCoordinates: false,
  };
}
