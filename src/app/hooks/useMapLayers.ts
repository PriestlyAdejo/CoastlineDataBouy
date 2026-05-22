import type L from "leaflet";
import type { DeploymentViewModel } from "../lib/deploymentViewModel";
import { BRIGHTON_MARINA_REF, BRIGHTON_TEST_POINT } from "../lib/mapConfig";

export type ReplayLayerHandles = {
  group: L.LayerGroup | null;
  buoyMarker: L.Marker | null;
  trackLine: L.Polyline | null;
  anchorCircle: L.Circle | null;
  marinaMarker: L.Marker | null;
  zoneCircle: L.Circle | null;
};

export function createEmptyLayerHandles(): ReplayLayerHandles {
  return {
    group: null,
    buoyMarker: null,
    trackLine: null,
    anchorCircle: null,
    marinaMarker: null,
    zoneCircle: null,
  };
}

export function ensureReplayLayerGroup(map: L.Map, handles: ReplayLayerHandles): L.LayerGroup {
  if (!handles.group) {
    handles.group = L.layerGroup().addTo(map);
  }
  return handles.group;
}

/** Update layers in place — never remove/recreate the Leaflet map. */
export function updateReplayMapLayers(
  map: L.Map,
  handles: ReplayLayerHandles,
  vm: DeploymentViewModel,
  enabled: { tracks: boolean; anchor: boolean; zones: boolean; buoy: boolean },
  createBuoyIcon: () => L.DivIcon,
): void {
  const g = ensureReplayLayerGroup(map, handles);
  const pos: [number, number] = [vm.position.lat, vm.position.lon];
  const radius = vm.location.uncertaintyRadiusM ?? 50;

  if (enabled.buoy) {
    if (!handles.buoyMarker) {
      handles.buoyMarker = L.marker(pos, { icon: createBuoyIcon() }).addTo(g);
    } else {
      handles.buoyMarker.setLatLng(pos);
    }
  } else {
    handles.buoyMarker?.remove();
    handles.buoyMarker = null;
  }

  if (enabled.anchor) {
    if (!handles.anchorCircle) {
      handles.anchorCircle = L.circle(BRIGHTON_TEST_POINT, {
        radius,
        color: "#22d3ee",
        fillColor: "#22d3ee",
        fillOpacity: 0.08,
        weight: 1,
        dashArray: "4 4",
      }).addTo(g);
    } else {
      handles.anchorCircle.setLatLng(BRIGHTON_TEST_POINT);
      handles.anchorCircle.setRadius(radius);
    }
  } else {
    handles.anchorCircle?.remove();
    handles.anchorCircle = null;
  }

  if (enabled.tracks && vm.track.length > 1) {
    const latlngs = vm.track.map((p) => [p.lat, p.lon] as [number, number]);
    if (!handles.trackLine) {
      handles.trackLine = L.polyline(latlngs, { color: "#22d3ee", weight: 2, opacity: 0.7 }).addTo(g);
    } else {
      handles.trackLine.setLatLngs(latlngs);
    }
  } else {
    handles.trackLine?.remove();
    handles.trackLine = null;
  }

  if (!handles.marinaMarker) {
    handles.marinaMarker = L.marker(BRIGHTON_MARINA_REF, {
      icon: L.divIcon({
        className: "",
        html: '<div style="font:10px monospace;color:#94a3b8">Marina ref</div>',
        iconAnchor: [30, 0],
      }),
    }).addTo(g);
  }

  if (enabled.zones) {
    if (!handles.zoneCircle) {
      handles.zoneCircle = L.circle(BRIGHTON_TEST_POINT, {
        radius: 120,
        color: "#475569",
        fillColor: "#475569",
        fillOpacity: 0.06,
        weight: 1,
        dashArray: "6 4",
      }).addTo(g);
    }
  } else {
    handles.zoneCircle?.remove();
    handles.zoneCircle = null;
  }
}
