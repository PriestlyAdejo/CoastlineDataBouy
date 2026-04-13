import L from "leaflet";

/**
 * Tailwind preflight (and similar resets) set img { max-width: 100%; height: auto }.
 * That breaks Leaflet raster tiles: the containing block width is tiny, so tiles shrink
 * to a few fragments. Inline !important beats any stylesheet.
 */
type PatchedCreateTile = typeof L.TileLayer.prototype.createTile & {
  __nereusTilePatch?: boolean;
};

export function applyLeafletTileImagePatch(): void {
  const proto = L.TileLayer.prototype as typeof L.TileLayer.prototype & {
    createTile: PatchedCreateTile;
  };
  if (proto.createTile.__nereusTilePatch) return;

  const original = proto.createTile;

  const wrapped: PatchedCreateTile = function (
    this: L.TileLayer,
    coords: object,
    done?: (err: unknown, tile?: HTMLElement) => void,
  ): HTMLElement {
    const tile = original.call(this, coords, done as never) as HTMLElement;

    if (!(tile instanceof HTMLImageElement)) {
      return tile;
    }

    const enforce = () => {
      const w = tile.naturalWidth || tile.width || 256;
      const h = tile.naturalHeight || tile.height || 256;
      tile.style.setProperty("max-width", "none", "important");
      tile.style.setProperty("max-height", "none", "important");
      tile.style.setProperty("width", `${w}px`, "important");
      tile.style.setProperty("height", `${h}px`, "important");
    };

    enforce();
    tile.addEventListener("load", enforce, { passive: true });

    return tile;
  };

  wrapped.__nereusTilePatch = true;
  proto.createTile = wrapped;
}

applyLeafletTileImagePatch();
