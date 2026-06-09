const DEMO_MODE_KEY = "nereus.demoMode";
const API_BASE_KEY = "nereus.apiBaseUrl";
const READABLE_KEY = "nereus.handoverReadable";
const HANDOVER_KEY = "nereus.handover";

/** Apply `?handover=1&apiBase=...&readable=1` before the app boots. */
export function applyHandoverUrlParams(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("handover") !== "1") return;

  window.localStorage.removeItem(DEMO_MODE_KEY);
  window.localStorage.setItem(HANDOVER_KEY, "1");

  const apiBase =
    params.get("apiBase")?.trim() ||
    (import.meta.env.VITE_API_BASE as string | undefined)?.trim() ||
    "http://127.0.0.1:8000/v1";
  window.localStorage.setItem(API_BASE_KEY, apiBase);
  window.localStorage.setItem(READABLE_KEY, "1");
}

/** Persisted handover session (survives refresh without query string). */
export function isHandoverSession(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(HANDOVER_KEY) === "1";
}

/** Re-apply handover constraints on every boot after URL params. */
export function enforceHandoverSession(): void {
  if (typeof window === "undefined" || !isHandoverSession()) return;
  window.localStorage.removeItem(DEMO_MODE_KEY);
  if (window.localStorage.getItem(READABLE_KEY) !== "0") {
    window.localStorage.setItem(READABLE_KEY, "1");
  }
}

export function isHandoverUrlActive(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("handover") === "1";
}

export function buildHandoverDashboardUrl(
  host = "127.0.0.1",
  port = 5173,
  apiBase = "http://127.0.0.1:8000/v1",
): string {
  const q = new URLSearchParams({
    handover: "1",
    apiBase,
    readable: "1",
  });
  return `http://${host}:${port}/?${q.toString()}`;
}
