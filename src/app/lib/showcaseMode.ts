import { BRIGHTON_DEMO } from "./demoMode";

const DEMO_MODE_KEY = "nereus.demoMode";
const HANDOVER_KEY = "nereus.handover";
const READABLE_KEY = "nereus.handoverReadable";
const SHOWCASE_KEY = "nereus.showcase";

/** Persisted Brighton Marina showcase session (survives refresh without query string). */
export function isShowcaseSession(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SHOWCASE_KEY) === "1";
}

/** Apply `?showcase=1&mode=brighton&readable=1` before handover bootstrap. */
export function applyShowcaseUrlParams(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const showcase = params.get("showcase") === "1";
  const modeBrighton = params.get("mode") === "brighton";
  if (!showcase && !modeBrighton) return false;

  window.localStorage.removeItem(HANDOVER_KEY);
  window.localStorage.setItem(DEMO_MODE_KEY, BRIGHTON_DEMO);
  window.localStorage.setItem(SHOWCASE_KEY, "1");
  if (params.get("readable") !== "0") {
    window.localStorage.setItem(READABLE_KEY, "1");
  }
  return true;
}

/** Re-assert showcase constraints on every boot (beats stale handover localStorage). */
export function enforceShowcaseSession(): void {
  if (typeof window === "undefined" || !isShowcaseSession()) return;
  window.localStorage.removeItem(HANDOVER_KEY);
  window.localStorage.setItem(DEMO_MODE_KEY, BRIGHTON_DEMO);
}

export function buildShowcaseDashboardUrl(host = "127.0.0.1", port = 5173): string {
  const q = new URLSearchParams({
    showcase: "1",
    mode: "brighton",
    readable: "1",
  });
  return `http://${host}:${port}/?${q.toString()}`;
}
