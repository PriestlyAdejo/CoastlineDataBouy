import { useEffect } from "react";
import type { Map } from "leaflet";

/** Global Leaflet resize helper — rAF + timeout after layout/tab/route changes. */
export function useLeafletInvalidateSize(
  map: Map | null,
  container: HTMLElement | null,
  deps: unknown[] = [],
): void {
  useEffect(() => {
    if (!map || !container) return;
    const invalidate = () => map.invalidateSize({ animate: false });
    const ro = new ResizeObserver(invalidate);
    ro.observe(container);
    invalidate();
    const raf1 = requestAnimationFrame(() => {
      invalidate();
      requestAnimationFrame(invalidate);
    });
    const t = window.setTimeout(invalidate, 120);
    window.addEventListener("resize", invalidate);
    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("resize", invalidate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, container, ...deps]);
}
