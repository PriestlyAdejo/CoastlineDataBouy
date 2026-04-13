import type { MapOptions } from "leaflet";

/** Renders paths/circles on canvas (slightly cheaper); raster tiles are still patched in leafletTileImagePatch.ts. */
export const nereusLeafletMapOptions: Partial<MapOptions> = {
  preferCanvas: true,
};
