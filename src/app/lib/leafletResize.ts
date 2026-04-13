import type { Map } from "leaflet";

/** Leaflet reads container size at init; flex layouts often report 0×0 until later. */
export function attachLeafletResizeHandlers(map: Map, container: HTMLElement): () => void {
  const invalidate = () => map.invalidateSize({ animate: false });
  const ro = new ResizeObserver(invalidate);
  ro.observe(container);
  invalidate();
  requestAnimationFrame(() => {
    invalidate();
    requestAnimationFrame(invalidate);
  });
  window.addEventListener("resize", invalidate);
  return () => {
    ro.disconnect();
    window.removeEventListener("resize", invalidate);
  };
}
