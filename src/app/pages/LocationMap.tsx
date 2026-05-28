import L from "leaflet";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { StatusBadge } from "../components/Widgets";
import { Card } from "../components/Card";
import {
  ZoomIn, ZoomOut, Locate, Crosshair, Layers, X, ChevronRight, ChevronLeft,
  Navigation, Wind, Waves, AlertTriangle, Shield, Map as MapIcon, Satellite, Mountain,
  Anchor, Clock, Download, Eye, EyeOff, Play, Pause, SkipForward,
  Radio, MapPin, Compass, Activity, Thermometer, Droplets, Fish, TreePine,
} from "lucide-react";
import { clsx } from "clsx";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { attachLeafletResizeHandlers } from "../lib/leafletResize";
import {
  getDashboardNodes,
  getDefaultNodeId,
  getMapConfig,
  isBrightonDemo,
  shouldShowClydeOverlays,
} from "../lib/demoMode";
import { useDeploymentView } from "../hooks/useDeploymentView";
import { useLiveNode } from "../components/LiveNodeProvider";
import { useReplayData } from "../lib/useReplayData";
import { BRIGHTON_MARINA_REF, BRIGHTON_TEST_POINT } from "../lib/mapConfig";
import { createEmptyLayerHandles, updateReplayMapLayers, type ReplayLayerHandles } from "../hooks/useMapLayers";
import { useLeafletInvalidateSize } from "../lib/useLeafletInvalidateSize";
import { NEREUS_DARK_BASEMAP } from "../lib/basemap";
import { nereusLeafletMapOptions } from "../lib/leafletMapOptions";
import {
  deploymentFitInputFromConfig,
  fitMapToDeploymentContext,
} from "../lib/mapViewFit";

// --- Data ---
type MapNode = ReturnType<typeof getDashboardNodes>[number] & {
  satellites?: number;
  hdop?: number;
  drift?: string;
  anchor?: string;
  lastSync?: string;
};

const clydeMapNodes: MapNode[] = [
  { id: "BY-04-A", displayName: "BY-04-A", pos: [55.65, -5.15], status: "Active", main: true, depth: "42.5m", battery: "87%", temp: "14.3°C", satellites: 8, hdop: 0.9, drift: "<0.5m/24h", anchor: "Deployed", lastSync: "12s ago" },
  { id: "BY-02-B", displayName: "BY-02-B", pos: [55.68, -5.05], status: "Standby", main: false, depth: "38.1m", battery: "92%", temp: "14.1°C", satellites: 7, hdop: 1.1, drift: "<0.8m/24h", anchor: "Deployed", lastSync: "45s ago" },
  { id: "BY-01-C", displayName: "BY-01-C", pos: [55.59, -5.22], status: "Maintenance", main: false, depth: "45.8m", battery: "34%", temp: "13.9°C", satellites: 5, hdop: 1.8, drift: "1.2m/24h", anchor: "Check required", lastSync: "5m ago" },
  { id: "BY-03-D", displayName: "BY-03-D", pos: [55.72, -5.30], status: "Active", main: false, depth: "29.2m", battery: "78%", temp: "14.5°C", satellites: 9, hdop: 0.7, drift: "<0.3m/24h", anchor: "Deployed", lastSync: "8s ago" },
];

function getMapNodes(): MapNode[] {
  const base = getDashboardNodes();
  if (shouldShowClydeOverlays()) {
    return clydeMapNodes;
  }
  return base.map((n) => ({
    ...n,
    satellites: 8,
    hdop: 0.9,
    drift: "<0.5m/24h",
    anchor: "Deployed",
    lastSync: "live",
  }));
}

const envConditions = {
  waveHeight: "1.4m", wavePeriod: "8.2s", waveDir: "NW",
  currentSpeed: "0.3 m/s", currentDir: "SSE",
  windSpeed: "12 kts", windDir: "NW", windGust: "18 kts",
  visibility: ">10km", seaState: "Moderate (3)",
  sst: "14.3°C", pressure: "1018 hPa",
};

const forecastTimeline = [
  { label: "Now", wind: "12 kts", wave: "1.4m", risk: "low" },
  { label: "+6h", wind: "15 kts", wave: "1.8m", risk: "low" },
  { label: "+12h", wind: "22 kts", wave: "2.4m", risk: "moderate" },
  { label: "+24h", wind: "28 kts", wave: "3.1m", risk: "high" },
  { label: "+48h", wind: "18 kts", wave: "2.0m", risk: "moderate" },
];

type MapStyle = "dark" | "satellite" | "terrain";
const tileUrls: Record<MapStyle, { url: string; label: string; icon: typeof MapIcon }> = {
  dark: { url: NEREUS_DARK_BASEMAP.url, label: "Dark", icon: MapIcon },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", label: "Satellite", icon: Satellite },
  terrain: { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", label: "Terrain", icon: Mountain },
};

type PanelMode = "buoy" | "overlays" | "deployment" | "forecast";
type OverlayGroup = "operational" | "ocean" | "weather" | "environmental";

interface OverlayItem {
  id: string;
  label: string;
  icon: typeof Wind;
  group: OverlayGroup;
  source: string;
  enabled: boolean;
  units?: string;
}

const defaultOverlays: OverlayItem[] = [
  { id: "buoy_positions", label: "Buoy Positions", icon: MapPin, group: "operational", source: "Live buoy telemetry", enabled: true },
  { id: "buoy_tracks", label: "Buoy Tracks (7d)", icon: Navigation, group: "operational", source: "Live buoy telemetry", enabled: false },
  { id: "anchor_radius", label: "Anchor Radius", icon: Anchor, group: "operational", source: "Live buoy telemetry", enabled: true },
  { id: "deployment_zones", label: "Deployment Zones", icon: Shield, group: "operational", source: "Static reference boundary", enabled: false },
  { id: "wave_height", label: "Wave Height", icon: Waves, group: "ocean", source: "ECMWF ERA5 / Copernicus Marine", enabled: false, units: "m" },
  { id: "currents", label: "Current Speed", icon: Activity, group: "ocean", source: "Copernicus Marine CMEMS", enabled: false, units: "m/s" },
  { id: "wind", label: "Wind Speed", icon: Wind, group: "ocean", source: "NOAA GFS / Met Éireann", enabled: false, units: "kts" },
  { id: "sst", label: "Sea Surface Temp", icon: Thermometer, group: "ocean", source: "OSTIA / Copernicus SST", enabled: false, units: "°C" },
  { id: "storm_warnings", label: "Storm Warnings", icon: AlertTriangle, group: "weather", source: "Met Éireann / UK Met Office", enabled: false },
  { id: "forecast_zones", label: "Marine Forecast Zones", icon: Compass, group: "weather", source: "UK Met Office Inshore Waters", enabled: false },
  { id: "rainfall", label: "Precipitation", icon: Droplets, group: "weather", source: "NOAA GFS / OpenWeatherMap", enabled: false },
  { id: "mpa", label: "Marine Protected Areas", icon: Shield, group: "environmental", source: "OSPAR / JNCC MPA Network", enabled: true },
  { id: "habitat", label: "Habitat Distribution", icon: Fish, group: "environmental", source: "EMODnet Seabed Habitats", enabled: false },
  { id: "sensitive_zones", label: "Sensitive Zones", icon: TreePine, group: "environmental", source: "SNH / NatureScot", enabled: false },
];

const overlayGroupLabels: Record<OverlayGroup, string> = {
  operational: "Operational",
  ocean: "Ocean Conditions",
  weather: "Weather / Forecast",
  environmental: "Environmental / Ecological",
};

// --- Marker icons ---
function createSelectedIcon() {
  return L.divIcon({
    className: "selected-node-icon",
    html: `<div class="relative flex items-center justify-center w-12 h-12">
      <div class="absolute w-full h-full rounded-full bg-cyan-400/20 animate-ping" style="animation-duration:2s"></div>
      <div class="absolute w-10 h-10 rounded-full border-2 border-cyan-400/40"></div>
      <div class="w-5 h-5 rounded-full bg-cyan-400 border-[3px] border-slate-900 z-10 shadow-[0_0_20px_rgba(6,182,212,1),0_0_40px_rgba(6,182,212,0.4)]"></div>
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

const secondaryIcon = L.divIcon({
  className: "secondary-node-icon",
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="w-3 h-3 rounded-full bg-slate-400 border-2 border-slate-900 z-10 shadow-[0_0_6px_rgba(148,163,184,0.4)]"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const warningIcon = L.divIcon({
  className: "warning-node-icon",
  html: `<div class="relative flex items-center justify-center w-8 h-8">
    <div class="absolute w-full h-full rounded-full bg-amber-500/25 animate-ping" style="animation-duration:2.5s"></div>
    <div class="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-900 z-10 shadow-[0_0_10px_rgba(245,158,11,0.7)]"></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export function LocationMap() {
  const location = useLocation();
  const vm = useDeploymentView();
  const live = useLiveNode();
  const replay = useReplayData();
  const liveGps = (live?.gps as any) ?? null;
  const locMetrics = vm?.location ?? (!isBrightonDemo() && liveGps ? {
    lat: liveGps.lat,
    lon: liveGps.lon,
    anchorState: liveGps.source === "ip_fallback" ? "approximate" : "gnss_fix",
    phaseLabel: live?.modeLabel ?? "LIVE API",
    driftM24h: null,
    uncertaintyRadiusM: liveGps.source === "ip_fallback" ? 1000 : 30,
  } : replay?.getLocationMetrics());
  const wave = vm?.wave ?? replay?.getWaveMetrics();
  const env = vm?.environment ?? replay?.getEnvironmentMetrics();
  const nodes = useMemo(() => {
    const base = getMapNodes();
    if (!isBrightonDemo() || locMetrics?.lat == null || locMetrics.lon == null) return base;
    return base.map((n) =>
      n.id === "ucl-buoy"
        ? {
            ...n,
            pos: [locMetrics.lat!, locMetrics.lon!] as [number, number],
            drift: locMetrics.driftM24h != null ? `${locMetrics.driftM24h}m/24h` : n.drift,
            anchor: locMetrics.anchorState ?? n.anchor,
            lastSync: "live",
            battery: replay?.getTelemetryMetrics().socPct ?? n.battery,
            temp: env?.waterTempC ? `${env.waterTempC}°C` : n.temp,
          }
        : n,
    );
  }, [locMetrics?.lat, locMetrics?.lon, locMetrics?.driftM24h, replay?.snapshots?.ts]);
  const mapConfig = getMapConfig();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const replayLayersRef = useRef<ReplayLayerHandles>(createEmptyLayerHandles());
  const [basemapError, setBasemapError] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>(shouldShowClydeOverlays() ? "dark" : "terrain");
  const [selectedNode, setSelectedNode] = useState(getDefaultNodeId());
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("buoy");
  const [overlays, setOverlays] = useState(defaultOverlays);
  const [showOverlayManager, setShowOverlayManager] = useState(false);
  const [forecastIdx, setForecastIdx] = useState(0);
  const [showLegend, setShowLegend] = useState(false);
  const [showBasemapSwitcher, setShowBasemapSwitcher] = useState(false);

  const selectedNodeRef = useRef(selectedNode);
  selectedNodeRef.current = selectedNode;

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    setPanelMode("buoy");
    setPanelOpen(true);
  }, []);
  const handleNodeClickRef = useRef(handleNodeClick);
  handleNodeClickRef.current = handleNodeClick;

  useLeafletInvalidateSize(mapRef.current, mapContainerRef.current, [panelOpen, location.pathname]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isBrightonDemo()) return;
    const marker = markersRef.current.get("ucl-buoy");
    const node = nodes.find((n) => n.id === "ucl-buoy");
    if (marker && node) marker.setLatLng(node.pos);
  }, [nodes]);

  const overlayEnabled = useMemo(() => {
    const on = (id: string) => overlays.find((o) => o.id === id)?.enabled ?? false;
    return {
      buoy: on("buoy_positions"),
      tracks: on("buoy_tracks"),
      anchor: on("anchor_radius"),
      zones: on("deployment_zones"),
    };
  }, [overlays]);

  const replayPhaseId = vm?.phase.id ?? replay?.getCurrentPhase()?.id;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !vm) return;
    updateReplayMapLayers(map, replayLayersRef.current, vm, overlayEnabled, createSelectedIcon);
    const t = window.setTimeout(() => map.invalidateSize({ animate: false }), 100);
    return () => window.clearTimeout(t);
  }, [vm?.position.lat, vm?.position.lon, vm?.track.length, overlayEnabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isBrightonDemo()) return;
    const lat = locMetrics?.lat ?? vm?.position.lat;
    const lon = locMetrics?.lon ?? vm?.position.lon;
    if (lat == null || lon == null) return;
    fitMapToDeploymentContext(
      map,
      deploymentFitInputFromConfig(mapConfig, { lat, lon }),
      { maxZoom: 15 },
    );
  }, [replayPhaseId, panelOpen, location.pathname]);

  // Initialize map
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el || mapRef.current) return;
    const defaultId = getDefaultNodeId();
    const map = L.map(el, {
      ...nereusLeafletMapOptions,
      center: mapConfig.center,
      zoom: mapConfig.zoom,
      zoomControl: false,
      attributionControl: mapConfig.showAttribution,
    });
    map.getContainer().style.background = "#0f172a";

    const tile = L.tileLayer(mapConfig.tileUrl, {
      attribution: mapConfig.attribution,
      maxZoom: 18,
    }).addTo(map);
    tile.on("tileerror", () => setBasemapError(true));
    tile.on("load", () => setBasemapError(false));
    tileRef.current = tile;

    if (!shouldShowClydeOverlays()) {
      nodes.forEach((node) => {
        const isSelected = node.id === defaultId;
        const icon = isSelected ? createSelectedIcon() : node.status === "Maintenance" ? warningIcon : secondaryIcon;
        const marker = L.marker(node.pos, { icon }).addTo(map);
        marker.on("click", () => handleNodeClickRef.current(node.id));
        markersRef.current.set(node.id, marker);
      });
      const buoy = nodes.find((n) => n.id === "ucl-buoy");
      if (buoy) {
        fitMapToDeploymentContext(
          map,
          deploymentFitInputFromConfig(mapConfig, { lat: buoy.pos[0], lon: buoy.pos[1] }),
          { maxZoom: 15, padRatio: 0.45 },
        );
      }
      mapRef.current = map;
      const detachResize = attachLeafletResizeHandlers(map, el);
      return () => {
        detachResize();
        map.remove();
        mapRef.current = null;
        markersRef.current.clear();
      };
    }

    // Add MPA circle overlay (static reference)
    L.circle([55.63, -5.20], {
      radius: 3000,
      color: "#22d3ee",
      fillColor: "#22d3ee",
      fillOpacity: 0.05,
      weight: 1,
      dashArray: "6 4",
    }).addTo(map).bindPopup(`<div style="font-family:monospace;font-size:11px;color:#94a3b8"><strong style="color:#22d3ee">Marine Protected Area</strong><br/>Source: JNCC MPA Network<br/>Status: Designated</div>`, { className: "custom-popup" });

    // Add anchor radius circles for active nodes
    nodes.forEach((node) => {
      if (node.status !== "Maintenance") {
        L.circle(node.pos, {
          radius: 200,
          color: "#334155",
          fillColor: "#334155",
          fillOpacity: 0.1,
          weight: 1,
          dashArray: "3 3",
        }).addTo(map);
      }
    });

    // Add deployment zone polygon
    L.polygon(
      [[55.58, -5.35], [55.58, -4.95], [55.74, -4.95], [55.74, -5.35]],
      { color: "#475569", fillColor: "#475569", fillOpacity: 0.03, weight: 1, dashArray: "8 4" }
    ).addTo(map);

    // Add markers
    nodes.forEach((node) => {
      const isSelected = node.id === selectedNodeRef.current;
      const icon = isSelected ? createSelectedIcon() : node.status === "Maintenance" ? warningIcon : secondaryIcon;
      const marker = L.marker(node.pos, { icon }).addTo(map);
      const statusColor = node.status === "Active" ? "#34d399" : node.status === "Standby" ? "#94a3b8" : "#fbbf24";
      marker.bindPopup(`
        <div style="font-family:monospace;min-width:180px">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;padding-bottom:6px;margin-bottom:6px">
            <strong style="color:#22d3ee;font-size:13px">${node.id}</strong>
            <span style="color:${statusColor};font-size:10px;text-transform:uppercase">${node.status}</span>
          </div>
          <div style="font-size:10px;color:#cbd5e1;line-height:1.6">
            <div style="display:flex;justify-content:space-between"><span style="color:#64748b">LAT</span><span>${node.pos[0].toFixed(5)}° N</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:#64748b">LON</span><span>${Math.abs(node.pos[1]).toFixed(5)}° W</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:#64748b">DEPTH</span><span>${node.depth}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:#64748b">SATS</span><span>${node.satellites}</span></div>
          </div>
        </div>`, { className: "custom-popup" });
      marker.on("click", () => handleNodeClickRef.current(node.id));
      markersRef.current.set(node.id, marker);
    });

    mapRef.current = map;
    const detachResize = attachLeafletResizeHandlers(map, el);
    return () => {
      detachResize();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [mapConfig.center, mapConfig.zoom, mapConfig.tileUrl]);

  // Update tile layer
  useEffect(() => {
    if (tileRef.current) tileRef.current.setUrl(tileUrls[mapStyle].url);
  }, [mapStyle]);

  // Update marker icons when selection changes
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const node = nodes.find((n) => n.id === id);
      if (!node) return;
      const icon = id === selectedNode ? createSelectedIcon() : node.status === "Maintenance" ? warningIcon : secondaryIcon;
      marker.setIcon(icon);
    });
  }, [selectedNode]);

  const current = nodes.find((n) => n.id === selectedNode) || nodes[0];
  const activeOverlays = overlays.filter((o) => o.enabled);

  const toggleOverlay = (id: string) => {
    setOverlays((prev) => prev.map((o) => o.id === id ? { ...o, enabled: !o.enabled } : o));
  };

  const riskColor = (r: string) => r === "low" ? "text-emerald-400" : r === "moderate" ? "text-amber-400" : "text-rose-400";
  const riskBg = (r: string) => r === "low" ? "bg-emerald-500/10 border-emerald-500/20" : r === "moderate" ? "bg-amber-500/10 border-amber-500/20" : "bg-rose-500/10 border-rose-500/20";

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      {/* Full-bleed Map */}
      <div className="absolute inset-0 z-0 min-h-0">
        <div ref={mapContainerRef} className="h-full min-h-0 w-full" style={{ minHeight: "100%" }} />
        {basemapError && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[5] px-3 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono text-amber-300">
            Basemap unavailable
          </div>
        )}
      </div>

      {/* Top-left: Status + Active Layers */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-lg px-4 py-2.5 flex items-center gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <div className="absolute top-0 left-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
            </div>
            <span className="text-xs font-mono text-emerald-400">LIVE</span>
          </div>
          <div className="w-px h-5 bg-slate-700"></div>
          <span className="text-xs font-mono text-slate-400">GPS 3D Fix — {current.satellites} Sats</span>
          <div className="w-px h-5 bg-slate-700"></div>
          <span className="text-[10px] font-mono text-slate-500">HDOP: {current.hdop}</span>
        </div>

        {/* Active layer chips */}
        {activeOverlays.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-w-md">
            {activeOverlays.slice(0, 5).map((o) => (
              <button
                key={o.id}
                onClick={() => toggleOverlay(o.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900/85 backdrop-blur-md border border-slate-700/60 text-[10px] font-mono text-cyan-400 hover:border-cyan-500/40 transition-colors shadow-lg"
              >
                <o.icon size={10} />
                {o.label}
                <X size={8} className="ml-0.5 text-slate-500" />
              </button>
            ))}
            {activeOverlays.length > 5 && (
              <span className="px-2 py-1 rounded-md bg-slate-900/85 text-[10px] font-mono text-slate-500 border border-slate-700/60">
                +{activeOverlays.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Map Controls (right, offset when panel is open) */}
      <div
        className="absolute top-4 z-10 flex flex-col gap-2 transition-all duration-300"
        style={{ right: panelOpen ? "calc(380px + 1rem)" : "1rem" }}
      >
        {/* Zoom */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-lg shadow-xl overflow-hidden">
          <button onClick={() => mapRef.current?.zoomIn()} className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors border-b border-slate-700/60">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => mapRef.current?.zoomOut()} className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors">
            <ZoomOut size={16} />
          </button>
        </div>

        {/* Navigation */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-lg shadow-xl overflow-hidden">
          <button
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              if (isBrightonDemo()) {
                fitMapToDeploymentContext(
                  map,
                  deploymentFitInputFromConfig(mapConfig, {
                    lat: current.pos[0],
                    lon: current.pos[1],
                  }),
                  { maxZoom: 15 },
                );
              } else {
                const b = L.latLngBounds(nodes.map((n) => n.pos));
                map.flyToBounds(b.pad(0.3));
              }
            }}
            className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors border-b border-slate-700/60"
            title="Fit deployment context"
          >
            <Locate size={16} />
          </button>
          <button
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              if (isBrightonDemo()) {
                fitMapToDeploymentContext(
                  map,
                  deploymentFitInputFromConfig(mapConfig, {
                    lat: current.pos[0],
                    lon: current.pos[1],
                  }),
                  { maxZoom: 15 },
                );
              } else {
                map.flyTo(current.pos, 13, { duration: 1 });
              }
            }}
            className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors border-b border-slate-700/60"
            title="Center on selected"
          >
            <Crosshair size={16} />
          </button>
          <button
            onClick={() => setShowOverlayManager(!showOverlayManager)}
            className={clsx(
              "flex items-center justify-center w-10 h-10 transition-colors border-b border-slate-700/60",
              showOverlayManager ? "text-cyan-400 bg-cyan-500/10" : "text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80"
            )}
            title="Toggle overlays"
          >
            <Layers size={16} />
          </button>
          <button
            onClick={() => setShowBasemapSwitcher(!showBasemapSwitcher)}
            className={clsx(
              "flex items-center justify-center w-10 h-10 transition-colors border-b border-slate-700/60",
              showBasemapSwitcher ? "text-cyan-400 bg-cyan-500/10" : "text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80"
            )}
            title="Change basemap"
          >
            <MapIcon size={16} />
          </button>
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={clsx(
              "flex items-center justify-center w-10 h-10 transition-colors",
              showLegend ? "text-cyan-400 bg-cyan-500/10" : "text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80"
            )}
            title="Toggle legend"
          >
            <Eye size={16} />
          </button>
        </div>

        {/* Export */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-lg shadow-xl overflow-hidden">
          <button className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors" title="Export snapshot">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Basemap Switcher Popover */}
      <AnimatePresence>
        {showBasemapSwitcher && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-[180px] z-20 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-lg shadow-2xl p-3"
            style={{ right: panelOpen ? "calc(380px + 4rem)" : "4rem" }}
          >
            <div className="text-[10px] font-mono text-slate-500 uppercase mb-2">Basemap Style</div>
            <div className="flex gap-2">
              {(Object.keys(tileUrls) as MapStyle[]).map((s) => {
                const Icon = tileUrls[s].icon;
                return (
                  <button
                    key={s}
                    onClick={() => { setMapStyle(s); setShowBasemapSwitcher(false); }}
                    className={clsx(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all w-20",
                      mapStyle === s ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                    )}
                  >
                    <Icon size={18} />
                    <span className="text-[10px] font-medium">{tileUrls[s].label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay Manager Popover */}
      <AnimatePresence>
        {showOverlayManager && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-[120px] z-20 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-2xl w-72 max-h-[60vh] overflow-y-auto"
            style={{ right: panelOpen ? "calc(380px + 4rem)" : "4rem" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Map Overlays</span>
              <button onClick={() => setShowOverlayManager(false)} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={14} /></button>
            </div>
            <div className="p-3 space-y-4">
              {(Object.keys(overlayGroupLabels) as OverlayGroup[]).map((group) => {
                const items = overlays.filter((o) => o.group === group);
                return (
                  <div key={group}>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{overlayGroupLabels[group]}</div>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => toggleOverlay(item.id)}
                          className={clsx(
                            "w-full flex items-center justify-between p-2 rounded-md border transition-colors text-left",
                            item.enabled ? "bg-cyan-500/5 border-cyan-500/20" : "border-slate-800 hover:border-slate-700"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <item.icon size={12} className={item.enabled ? "text-cyan-400" : "text-slate-500"} />
                            <div>
                              <div className={clsx("text-xs", item.enabled ? "text-slate-200" : "text-slate-400")}>{item.label}</div>
                              <div className="text-[9px] font-mono text-slate-600">{item.source}</div>
                            </div>
                          </div>
                          <div className={clsx("w-3 h-3 rounded-full border-2 transition-colors",
                            item.enabled ? "bg-cyan-400 border-cyan-400" : "border-slate-600"
                          )} />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-4 z-20 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-lg shadow-2xl p-4 w-56"
          >
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Map Legend</div>
            <div className="space-y-2.5 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-900 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
                <span className="text-slate-300">Selected buoy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-400 border-2 border-slate-900"></div>
                <span className="text-slate-300">Active / Standby buoy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900"></div>
                <span className="text-slate-300">Maintenance required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-px border-t border-dashed border-slate-500"></div>
                <span className="text-slate-400">Anchor radius (200m)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-px border-t border-dashed border-cyan-500/60"></div>
                <span className="text-slate-400">Marine Protected Area</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 border border-dashed border-slate-500 bg-slate-500/5 rounded-sm"></div>
                <span className="text-slate-400">Deployment zone</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Node Selector Chips - Bottom */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        {nodes.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              setSelectedNode(n.id);
              setPanelMode("buoy");
              setPanelOpen(true);
              mapRef.current?.flyTo(n.pos, 13, { duration: 1 });
            }}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-md shadow-lg transition-all text-xs font-mono",
              selectedNode === n.id
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-cyan-500/10"
                : "bg-slate-900/85 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
            )}
          >
            <div className={clsx(
              "w-2 h-2 rounded-full",
              n.status === "Active" ? "bg-emerald-400" : n.status === "Standby" ? "bg-slate-400" : "bg-amber-400"
            )} />
            {n.id}
          </button>
        ))}
      </div>

      {/* Forecast Timeline Bar - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-lg shadow-xl px-3 py-2 flex items-center gap-3">
        <Clock size={12} className="text-slate-500" />
        {forecastTimeline.map((f, i) => (
          <button
            key={f.label}
            onClick={() => setForecastIdx(i)}
            className={clsx(
              "px-2.5 py-1 rounded text-[10px] font-mono transition-colors",
              forecastIdx === i ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="w-px h-4 bg-slate-700"></div>
        <span className={clsx("text-[10px] font-mono font-semibold", riskColor(forecastTimeline[forecastIdx].risk))}>
          {forecastTimeline[forecastIdx].risk.toUpperCase()} RISK
        </span>
      </div>

      {/* Panel Toggle */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-6 h-16 rounded-l-lg bg-slate-900/90 border border-r-0 border-slate-700/60 text-slate-400 hover:text-cyan-400 backdrop-blur-md shadow-xl transition-all"
        style={{ right: panelOpen ? "380px" : "0px", transition: "right 0.3s ease" }}
      >
        {panelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Floating Right Panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ x: 380 }}
            animate={{ x: 0 }}
            exit={{ x: 380 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute top-0 right-0 bottom-0 w-[380px] z-10 flex flex-col bg-slate-950/92 backdrop-blur-xl border-l border-slate-700/60 shadow-2xl"
          >
            {/* Panel Mode Tabs */}
            <div className="flex shrink-0 border-b border-slate-800/80">
              {([
                { id: "buoy" as const, label: "Buoy", icon: Radio },
                { id: "deployment" as const, label: "Deploy", icon: Anchor },
                { id: "forecast" as const, label: "Forecast", icon: Wind },
                { id: "overlays" as const, label: "Layers", icon: Layers },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPanelMode(tab.id)}
                  className={clsx(
                    "flex-1 flex flex-col items-center gap-1 py-3 px-2 text-[10px] font-mono uppercase tracking-wider transition-colors relative",
                    panelMode === tab.id ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                  {panelMode === tab.id && (
                    <motion.div layoutId="mapPanelTab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {panelMode === "buoy" && <BuoyPanel node={current} />}
              {panelMode === "deployment" && <DeploymentPanel node={current} forecastIdx={forecastIdx} />}
              {panelMode === "forecast" && <ForecastPanel forecastIdx={forecastIdx} />}
              {panelMode === "overlays" && <OverlaysPanel overlays={overlays} toggleOverlay={toggleOverlay} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Panel Components ---

function BuoyPanel({ node }: { node: MapNode }) {
  const replay = useReplayData();
  const wave = replay?.getWaveMetrics();
  const env = replay?.getEnvironmentMetrics();
  const loc = replay?.getLocationMetrics();
  const brighton = isBrightonDemo();
  return (
    <>
      {/* Selected Buoy Card */}
      <Card className="!bg-slate-900/60 !p-0">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Radio size={16} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-mono text-slate-100">{node.id}</div>
            <div className="text-[10px] font-mono text-slate-500">
              {node.pos[0].toFixed(5)}°N, {Math.abs(node.pos[1]).toFixed(5)}°W
            </div>
          </div>
          <StatusBadge status={node.status === "Active" ? "success" : node.status === "Standby" ? "neutral" : "warning"}>
            {node.status}
          </StatusBadge>
        </div>
        <div className="p-4 space-y-2.5 text-xs font-mono">
          {[
            { label: "DEPTH", value: node.depth },
            { label: "BATTERY", value: node.battery },
            { label: "GPS FIX", value: `3D — ${node.satellites} Satellites` },
            { label: "HDOP", value: `${node.hdop} ${node.hdop < 1 ? "(Excellent)" : node.hdop < 1.5 ? "(Good)" : "(Fair)"}` },
            { label: "DRIFT", value: node.drift },
            { label: "ANCHOR", value: node.anchor },
            { label: "LAST SYNC", value: node.lastSync },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
              <span className="text-slate-500 uppercase tracking-wider">{item.label}</span>
              <span className={clsx("text-slate-200", item.label === "GPS FIX" && "text-emerald-400")}>{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Environmental Context */}
      <Card title="Environmental context" className="!bg-slate-900/60">
        <div className="space-y-2.5 text-xs font-mono mt-1">
          <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">
            {brighton ? "Field test forecast" : "Source: Public marine forecast"}
          </div>
          {(brighton && wave
            ? [
                { label: "PHASE", value: loc?.phaseLabel ?? "—" },
                { label: "WAVE HS", value: `${wave.hsM} m` },
                { label: "WAVE TP", value: `${wave.tpS} s` },
                { label: "CURRENT", value: `${wave.currentMps} m/s` },
                { label: "WATER TEMP", value: `${env?.waterTempC ?? "—"} °C` },
                { label: "POSITION", value: loc?.anchorState ?? "—" },
                { label: "UNCERTAINTY", value: `${loc?.uncertaintyRadiusM ?? 50} m` },
              ]
            : [
            { label: "WAVE HEIGHT", value: `${envConditions.waveHeight} (${envConditions.waveDir})` },
            { label: "WAVE PERIOD", value: envConditions.wavePeriod },
            { label: "CURRENT", value: `${envConditions.currentSpeed} ${envConditions.currentDir}` },
            { label: "WIND", value: `${envConditions.windSpeed} ${envConditions.windDir} (Gusts ${envConditions.windGust})` },
            { label: "SEA STATE", value: envConditions.seaState },
            { label: "SST", value: envConditions.sst },
            { label: "VISIBILITY", value: envConditions.visibility },
          ]).map((item) => (
            <div key={item.label} className="flex justify-between items-center">
              <span className="text-slate-500">{item.label}</span>
              <span className="text-slate-200">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Alerts */}
      <Card title="Active Alerts" className="!bg-slate-900/60">
        <div className="space-y-2 mt-1">
          {node.status === "Maintenance" ? (
            <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <div>
                <div className="text-xs text-amber-400">Maintenance Required</div>
                <div className="text-[10px] font-mono text-slate-500">Battery low / anchor check needed</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-2">No active alerts for this node</div>
          )}
        </div>
      </Card>
    </>
  );
}

function DeploymentPanel({ node, forecastIdx }: { node: typeof nodes[0]; forecastIdx: number }) {
  const fc = forecastTimeline[forecastIdx];
  const suitability = fc.risk === "low" ? "Suitable" : fc.risk === "moderate" ? "Use Caution" : "Poor Conditions";
  const suitStatus = fc.risk === "low" ? "success" : fc.risk === "moderate" ? "warning" : "error";

  return (
    <>
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Deployment Decision Support</div>

      {/* Suitability Card */}
      <Card className="!bg-slate-900/60 !p-0">
        <div className={clsx("px-4 py-4 border-b border-slate-800 flex items-center justify-between",
          fc.risk === "low" ? "bg-emerald-500/5" : fc.risk === "moderate" ? "bg-amber-500/5" : "bg-rose-500/5"
        )}>
          <div>
            <div className="text-[10px] font-mono text-slate-500 uppercase">Deployment Suitability</div>
            <div className={clsx("text-lg font-semibold mt-1",
              fc.risk === "low" ? "text-emerald-400" : fc.risk === "moderate" ? "text-amber-400" : "text-rose-400"
            )}>{suitability}</div>
          </div>
          <StatusBadge status={suitStatus as any}>{fc.risk.toUpperCase()} RISK</StatusBadge>
        </div>
        <div className="p-4 space-y-3 text-xs font-mono">
          <div className="flex justify-between"><span className="text-slate-500">WIND</span><span className="text-slate-200">{fc.wind}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">WAVE HEIGHT</span><span className="text-slate-200">{fc.wave}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">CURRENT</span><span className="text-slate-200">{envConditions.currentSpeed}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">VISIBILITY</span><span className="text-slate-200">{envConditions.visibility}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">MPA CONFLICT</span><span className="text-emerald-400">None</span></div>
          <div className="flex justify-between"><span className="text-slate-500">WEATHER ALERTS</span><span className={fc.risk === "high" ? "text-rose-400" : "text-emerald-400"}>{fc.risk === "high" ? "Storm warning" : "None"}</span></div>
        </div>
      </Card>

      {/* Recommendation */}
      <Card title="Recommendation" className="!bg-slate-900/60">
        <div className="text-xs text-slate-400 mt-1 space-y-2">
          {fc.risk === "low" && <p>Conditions are within acceptable parameters for deployment and retrieval operations. Wind and wave conditions are moderate. No marine protected area conflicts at this position.</p>}
          {fc.risk === "moderate" && <p>Conditions are marginal. Elevated wind speeds and wave heights may affect deployment safety. Monitor forecast closely and consider postponing if conditions deteriorate.</p>}
          {fc.risk === "high" && <p className="text-rose-400/80">Conditions are unsuitable for safe deployment operations. Storm warning active. Wave heights exceed safe thresholds. Postpone all field operations until conditions improve.</p>}
        </div>
      </Card>

      {/* Position Context */}
      <Card title="Position Context" className="!bg-slate-900/60">
        <div className="space-y-2 text-xs font-mono mt-1">
          <div className="flex justify-between"><span className="text-slate-500">NODE</span><span className="text-cyan-400">{node.id}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">DEPTH</span><span className="text-slate-200">{node.depth}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">SEABED</span><span className="text-slate-200">Sandy gravel</span></div>
          <div className="flex justify-between"><span className="text-slate-500">NEAREST MPA</span><span className="text-slate-200">~1.2 km (outside)</span></div>
          <div className="flex justify-between"><span className="text-slate-500">SHIPPING LANE</span><span className="text-slate-200">~3.5 km</span></div>
        </div>
      </Card>
    </>
  );
}

function ForecastPanel({ forecastIdx }: { forecastIdx: number }) {
  return (
    <>
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Marine Forecast</div>
      <div className="text-[9px] font-mono text-slate-600">Sources: Met Éireann / UK Met Office / ECMWF</div>

      <div className="space-y-2">
        {forecastTimeline.map((f, i) => {
          const riskColor = f.risk === "low" ? "text-emerald-400" : f.risk === "moderate" ? "text-amber-400" : "text-rose-400";
          const riskBg = f.risk === "low" ? "border-emerald-500/20 bg-emerald-500/5" : f.risk === "moderate" ? "border-amber-500/20 bg-amber-500/5" : "border-rose-500/20 bg-rose-500/5";
          return (
            <div key={f.label} className={clsx(
              "p-3 rounded-lg border transition-colors",
              i === forecastIdx ? riskBg : "border-slate-800 bg-slate-900/40"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className={clsx("text-xs font-mono font-semibold", i === forecastIdx ? "text-slate-100" : "text-slate-400")}>{f.label}</span>
                <span className={clsx("text-[10px] font-mono font-semibold uppercase", riskColor)}>{f.risk}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div><span className="text-slate-500">Wind: </span><span className="text-slate-300">{f.wind}</span></div>
                <div><span className="text-slate-500">Wave: </span><span className="text-slate-300">{f.wave}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      <Card title="Forecast Summary" className="!bg-slate-900/60">
        <div className="text-xs text-slate-400 mt-1 space-y-2">
          <p>Current conditions are acceptable. Winds expected to increase over the next 12-24 hours with a weather system moving through from the northwest. Conditions should begin improving after 48 hours.</p>
          <p className="text-slate-500 italic">Forecast valid: 1 May 2026 12:00 UTC — Updated every 6h</p>
        </div>
      </Card>
    </>
  );
}

function OverlaysPanel({ overlays, toggleOverlay }: { overlays: OverlayItem[]; toggleOverlay: (id: string) => void }) {
  return (
    <>
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Layer Manager</div>
      {(Object.keys(overlayGroupLabels) as OverlayGroup[]).map((group) => {
        const items = overlays.filter((o) => o.group === group);
        return (
          <div key={group}>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{overlayGroupLabels[group]}</div>
            <div className="space-y-1.5">
              {items.map((item) => (
                <label key={item.id} className="flex items-center justify-between p-2.5 rounded-md border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer bg-slate-900/40">
                  <div className="flex items-center gap-2.5">
                    <item.icon size={13} className={item.enabled ? "text-cyan-400" : "text-slate-500"} />
                    <div>
                      <div className={clsx("text-xs", item.enabled ? "text-slate-200" : "text-slate-400")}>{item.label}</div>
                      <div className="text-[9px] font-mono text-slate-600">{item.source}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleOverlay(item.id)}
                    className={clsx(
                      "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
                      item.enabled ? "bg-cyan-500/40" : "bg-slate-700"
                    )}
                  >
                    <span className={clsx(
                      "inline-block h-3 w-3 rounded-full transition-transform",
                      item.enabled ? "translate-x-3.5 bg-cyan-400" : "translate-x-0.5 bg-slate-500"
                    )} />
                  </button>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}