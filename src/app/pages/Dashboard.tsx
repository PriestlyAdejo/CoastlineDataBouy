import L from "leaflet";
import { StatusBadge, MetricCard } from "../components/Widgets";
import { Card } from "../components/Card";
import {
  Activity, Battery, ChevronLeft, ChevronRight, Crosshair,
  MapPin, Radio, Thermometer, Waves, AlertTriangle,
  BarChart3, Navigation, Locate, ZoomIn, ZoomOut,
  Wind, Anchor, Heart, Cpu, ExternalLink, X, Pin,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, LineChart, Line, CartesianGrid, Tooltip,
} from "recharts";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { useOverview } from "../components/OverviewContext";
import { createMPAOverlay, createAnchorRadiusOverlay } from "../components/MapOverlays";
import { createApiClient, type LatestSnapshots } from "../api/client";
import {
  getDashboardNodes,
  getDefaultNodeId,
  getMapConfig,
  getReplayBannerText,
  isBrightonDemo,
  shouldShowClydeOverlays,
  type DashboardNode,
} from "../lib/demoMode";
import { attachLeafletResizeHandlers } from "../lib/leafletResize";
import {
  formatMetric,
  getBatterySocPct,
  getHealthStatus,
  getLeqDb,
  getWaterTempC,
} from "../lib/snapshotMetrics";
import { nereusLeafletMapOptions } from "../lib/leafletMapOptions";

// Fix leaflet defaults
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Shared markers - matching LocationMap
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

function createSelectedLabel(name: string) {
  return L.divIcon({
    className: "selected-label",
    html: `<div style="background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.35);border-radius:4px;padding:1px 6px;font-family:ui-monospace,monospace;font-size:10px;color:#22d3ee;white-space:nowrap;backdrop-filter:blur(6px);text-align:center">${name}</div>`,
    iconSize: [70, 18],
    iconAnchor: [35, -14],
  });
}

const secondaryIcon = L.divIcon({
  className: "secondary-node-icon",
  html: `<div class="relative flex items-center justify-center w-6 h-6"><div class="w-3 h-3 rounded-full bg-slate-400 border-2 border-slate-900 z-10 shadow-[0_0_6px_rgba(148,163,184,0.4)]"></div></div>`,
  iconSize: [24, 24], iconAnchor: [12, 12],
});
const warningIcon = L.divIcon({
  className: "warning-node-icon",
  html: `<div class="relative flex items-center justify-center w-8 h-8"><div class="absolute w-full h-full rounded-full bg-amber-500/25 animate-ping" style="animation-duration:2.5s"></div><div class="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-900 z-10 shadow-[0_0_10px_rgba(245,158,11,0.7)]"></div></div>`,
  iconSize: [32, 32], iconAnchor: [16, 16],
});

const envData = [
  { time: "00:00", temp: 14.2, do: 8.1 }, { time: "04:00", temp: 14.0, do: 8.0 },
  { time: "08:00", temp: 13.8, do: 7.8 }, { time: "12:00", temp: 14.5, do: 8.2 },
  { time: "16:00", temp: 14.8, do: 8.4 }, { time: "20:00", temp: 14.6, do: 8.3 },
  { time: "24:00", temp: 14.3, do: 8.1 },
];
const waveData = [
  { time: "00:00", height: 1.2 }, { time: "04:00", height: 1.5 },
  { time: "08:00", height: 1.8 }, { time: "12:00", height: 2.1 },
  { time: "16:00", height: 1.9 }, { time: "20:00", height: 1.6 },
  { time: "24:00", height: 1.4 },
];

const anomalies = [
  { id: 1, title: "Acoustic Spike Detected", time: "14:22:05 GMT", source: "Hydrophone 1", severity: "warning" as const },
  { id: 2, title: "Comm Link Degraded", time: "11:05:12 GMT", source: "Iridium SAT", severity: "error" as const },
  { id: 3, title: "Routine Calibration", time: "08:00:00 GMT", source: "CTD Sensor", severity: "info" as const },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { pinnedWidgets, unpinWidget } = useOverview();
  const nodes = useMemo(() => getDashboardNodes(), []);
  const brighton = isBrightonDemo();
  const mapConfig = useMemo(() => getMapConfig(), []);
  const replayBanner = getReplayBannerText();
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string>(getDefaultNodeId());
  const [snapshots, setSnapshots] = useState<LatestSnapshots | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const labelsRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const handleNodeClickRef = useRef<(nodeId: string) => void>(() => {});

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node && mapRef.current) {
      mapRef.current.flyTo(node.pos, mapConfig.zoom, { duration: 1.2 });
    }
    setPanelOpen(true);
  }, [nodes, mapConfig.zoom]);

  useEffect(() => { handleNodeClickRef.current = handleNodeClick; }, [handleNodeClick]);

  useEffect(() => {
    if (!brighton) return;
    let cancelled = false;
    const client = createApiClient();
    const load = () => {
      client.getLatestSnapshots(getDefaultNodeId()).then((s) => {
        if (!cancelled) setSnapshots(s);
      }).catch(() => { if (!cancelled) setSnapshots(null); });
    };
    load();
    const id = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [brighton]);

  useEffect(() => {
    mapRef.current?.invalidateSize({ animate: false });
  }, [panelOpen]);

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
    L.tileLayer(mapConfig.tileUrl, {
      attribution: mapConfig.attribution,
      maxZoom: 18,
    }).addTo(map);

    if (shouldShowClydeOverlays()) {
      createMPAOverlay(map).addTo(map);
      createAnchorRadiusOverlay(map, nodes).addTo(map);
    }

    nodes.forEach(node => {
      const isSelected = node.id === defaultId;
      const icon = isSelected ? createSelectedIcon() : node.status === "Maintenance" ? warningIcon : secondaryIcon;
      const marker = L.marker(node.pos, { icon, zIndexOffset: isSelected ? 1000 : 0 }).addTo(map);

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
          </div>
        </div>`, { className: "custom-popup" });
      marker.on("click", () => handleNodeClickRef.current(node.id));
      markersRef.current.set(node.id, marker);

      if (isSelected) {
        const label = L.marker(node.pos, { icon: createSelectedLabel(node.displayName), interactive: false, zIndexOffset: 1001 }).addTo(map);
        labelsRef.current.set(node.id, label);
      }
    });

    mapRef.current = map;
    const detachResize = attachLeafletResizeHandlers(map, el);
    return () => {
      detachResize();
      map.remove();
      mapRef.current = null;
    };
  }, [mapConfig, nodes]);

  // Update marker icons on selection change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    labelsRef.current.forEach(l => map.removeLayer(l));
    labelsRef.current.clear();
    markersRef.current.forEach((marker, id) => {
      const node = nodes.find(n => n.id === id);
      if (!node) return;
      const isSelected = id === selectedNode;
      marker.setIcon(isSelected ? createSelectedIcon() : node.status === "Maintenance" ? warningIcon : secondaryIcon);
      marker.setZIndexOffset(isSelected ? 1000 : 0);
      if (isSelected) {
        const label = L.marker(node.pos, { icon: createSelectedLabel(node.displayName), interactive: false, zIndexOffset: 1001 }).addTo(map);
        labelsRef.current.set(node.id, label);
      }
    });
  }, [selectedNode, nodes]);

  const currentNode = useMemo(() => nodes.find(n => n.id === selectedNode) || nodes[0], [selectedNode, nodes]);

  const waterTemp = brighton ? formatMetric(getWaterTempC(snapshots)) : "14.3";
  const batteryPct = brighton ? formatMetric(getBatterySocPct(snapshots), 0) : "87";
  const noiseDb = brighton ? formatMetric(getLeqDb(snapshots), 1) : "62";
  const healthStatus = brighton ? (getHealthStatus(snapshots) ?? "—") : "ok";

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      {/* Full-bleed Map */}
      <div className="absolute inset-0 z-0 min-h-0">
        <div ref={mapContainerRef} className="h-full min-h-0 w-full" style={{ minHeight: "100%" }} />
      </div>

      {/* Top-left: Status */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg px-4 py-2.5 flex items-center gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <div className="absolute top-0 left-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
            </div>
            <span className="text-xs font-mono text-emerald-400">LIVE</span>
          </div>
          <div className="w-px h-5 bg-slate-700"></div>
          <StatusBadge status="success">{brighton ? healthStatus : "Transmitting"}</StatusBadge>
          {replayBanner && (
            <>
              <div className="w-px h-5 bg-slate-700"></div>
              <span className="text-xs font-mono text-amber-400/90">{replayBanner}</span>
            </>
          )}
          <div className="w-px h-5 bg-slate-700"></div>
          <span className="text-xs font-mono text-slate-500">
            {brighton && snapshots?.ts ? `Last sync: ${snapshots.ts}` : "Last Sync: 12s ago"}
          </span>
        </div>
      </div>

      {/* Quick overlay chips on the map */}
      {shouldShowClydeOverlays() && (
      <div className="absolute top-16 left-4 z-10 flex gap-1.5">
        {["MPA", "Anchor Radius"].map(chip => (
          <span key={chip} className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900/85 backdrop-blur-md border border-slate-700/60 text-[10px] font-mono text-cyan-400 shadow-lg">
            <MapPin size={9} />{chip}
          </span>
        ))}
      </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-4 z-10 flex flex-col gap-2 transition-all duration-300" style={{ right: panelOpen ? "calc(400px + 1rem)" : "1rem" }}>
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg shadow-xl overflow-hidden">
          <button onClick={() => mapRef.current?.zoomIn()} className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors border-b border-slate-700/60"><ZoomIn size={18} /></button>
          <button onClick={() => mapRef.current?.zoomOut()} className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"><ZoomOut size={18} /></button>
        </div>
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg shadow-xl overflow-hidden">
          <button onClick={() => { const b = L.latLngBounds(nodes.map(n => n.pos)); mapRef.current?.flyToBounds(b.pad(0.3), { duration: 1.2 }); }} className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors border-b border-slate-700/60"><Locate size={18} /></button>
          <button onClick={() => { if (currentNode) { mapRef.current?.flyTo(currentNode.pos, 13, { duration: 1.2 }); } }} className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors border-b border-slate-700/60"><Crosshair size={18} /></button>
          <button onClick={() => navigate("/map")} className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors" title="Open full map"><ExternalLink size={16} /></button>
        </div>
      </div>

      {/* Node chips - Bottom */}
      {nodes.length > 1 && (
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        {nodes.map(node => (
          <button key={node.id} onClick={() => handleNodeClick(node.id)}
            className={clsx("flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-md shadow-lg transition-all text-xs font-mono",
              selectedNode === node.id ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-cyan-500/10" : "bg-slate-900/85 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:text-slate-100")}>
            <div className={clsx("w-2 h-2 rounded-full", node.status === "Active" ? "bg-emerald-400" : node.status === "Standby" ? "bg-slate-400" : "bg-amber-400")} />
            {node.id}
          </button>
        ))}
      </div>
      )}

      {/* "Open Full Map" floating CTA - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <button onClick={() => navigate("/map")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/60 text-xs font-mono text-cyan-400 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-colors shadow-xl">
          <ExternalLink size={12} /> Open Full Geospatial View
        </button>
      </div>

      {/* Panel Toggle */}
      <button onClick={() => setPanelOpen(!panelOpen)}
        className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-6 h-16 rounded-l-lg bg-slate-900/90 border border-r-0 border-slate-700/60 text-slate-400 hover:text-cyan-400 backdrop-blur-md shadow-xl transition-all"
        style={{ right: panelOpen ? "400px" : "0px", transition: "right 0.3s ease" }}>
        {panelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Modular Right Panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute top-0 right-0 bottom-0 w-[400px] z-10 flex flex-col bg-slate-950/92 backdrop-blur-xl border-l border-slate-700/60 shadow-2xl">

            {/* Panel Header */}
            <div className="shrink-0 px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Overview Panel</span>
              </div>
              <span className="text-[10px] font-mono text-slate-600">{pinnedWidgets.length} pinned widgets</span>
            </div>

            {/* Scrollable Widget Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Selected Node — always shown */}
              <SelectedNodeWidget node={currentNode} />

              {/* Environmental Quick Metrics - always shown */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard title="Water Temp" value={waterTemp} unit="°C" trend="up" trendValue={brighton ? "Live" : "+0.2°C"} icon={Thermometer} status="normal" className="!p-3" />
                <MetricCard title="Wave Height" value={brighton ? "0.2" : "1.4"} unit="m" trend="down" trendValue={brighton ? "Replay" : "-0.2m"} icon={Waves} status="info" className="!p-3" />
                <MetricCard title="Battery" value={batteryPct} unit="%" trend="down" trendValue={brighton ? "Live" : "-1.2W"} icon={Battery} status="success" className="!p-3" />
                <MetricCard title="Noise Floor" value={noiseDb} unit="dB" trend="neutral" trendValue="Ambient" icon={Activity} status="warning" className="!p-3" />
              </div>

              {/* Pinned Widgets */}
              {pinnedWidgets.map(widget => (
                <PinnedWidgetCard key={widget.id} widget={widget} onUnpin={() => unpinWidget(widget.id)} />
              ))}

              {/* Recent Alerts - always shown */}
              <Card title="Recent Alerts" className="!bg-slate-900/60">
                <div className="space-y-2 mt-1">
                  {anomalies.map(a => (
                    <div key={a.id} className={clsx("rounded-md border p-2.5 border-l-2",
                      a.severity === "error" ? "border-l-rose-500 bg-rose-500/5 border-slate-800" : a.severity === "warning" ? "border-l-amber-500 bg-amber-500/5 border-slate-800" : "border-l-cyan-500 bg-cyan-500/5 border-slate-800")}>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-200">{a.title}</span>
                        <StatusBadge status={a.severity === "error" ? "error" : a.severity === "warning" ? "warning" : "info"}>{a.severity}</StatusBadge>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1">{a.time} | {a.source}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Deployment Nodes */}
              <Card title="Deployment Nodes" className="!bg-slate-900/60">
                <div className="space-y-2">
                  {nodes.map(node => (
                    <button key={node.id} onClick={() => handleNodeClick(node.id)}
                      className={clsx("w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors text-left",
                        node.id === currentNode.id ? "border-cyan-500/30 bg-cyan-500/5" : "border-slate-800 hover:border-slate-700")}>
                      <div className="flex items-center gap-2">
                        <div className={clsx("w-2 h-2 rounded-full", node.status === "Active" ? "bg-emerald-400" : node.status === "Standby" ? "bg-slate-400" : "bg-amber-400")} />
                        <span className="text-xs font-mono text-slate-200">{node.id}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                        <span>{node.depth}</span>
                        <StatusBadge status={node.status === "Active" ? "success" : node.status === "Standby" ? "neutral" : "warning"}>{node.status}</StatusBadge>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Subcomponents ---

function SelectedNodeWidget({ node }: { node: DashboardNode }) {
  return (
    <Card className="!bg-slate-900/60 !p-0">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Radio size={16} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-mono text-slate-100">{node.displayName}</div>
          <div className="text-[10px] font-mono text-slate-500">{node.pos[0].toFixed(4)}°N, {Math.abs(node.pos[1]).toFixed(4)}°W</div>
        </div>
        <StatusBadge status={node.status === "Active" ? "success" : node.status === "Standby" ? "neutral" : "warning"}>{node.status}</StatusBadge>
      </div>
      <div className="p-4 grid grid-cols-3 gap-3 text-center">
        <div><div className="text-[10px] font-mono text-slate-500">DEPTH</div><div className="text-sm font-mono text-slate-200 mt-0.5">{node.depth}</div></div>
        <div><div className="text-[10px] font-mono text-slate-500">BATTERY</div><div className="text-sm font-mono text-slate-200 mt-0.5">{node.battery}</div></div>
        <div><div className="text-[10px] font-mono text-slate-500">WATER</div><div className="text-sm font-mono text-slate-200 mt-0.5">{node.temp}</div></div>
      </div>
    </Card>
  );
}

function PinnedWidgetCard({ widget, onUnpin }: { widget: { id: string; source: string; label: string; type: string }; onUnpin: () => void }) {
  // Render different content based on widget type/id
  if (widget.type === "chart" || widget.id === "env-water-temp") {
    return (
      <Card className="!bg-slate-900/60" title={
        <div className="flex items-center justify-between w-full">
          <span>{widget.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-600 normal-case tracking-normal">{widget.source}</span>
            <button onClick={onUnpin} className="text-slate-600 hover:text-slate-400 transition-colors"><X size={12} /></button>
          </div>
        </div>
      }>
        <div className="h-28 w-full mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={waveData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="ovWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#334155" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#334155" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} />
              <Area type="monotone" dataKey="height" stroke="#06b6d4" strokeWidth={1.5} fill="url(#ovWaveGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  if (widget.type === "acoustic" || widget.id === "hydrophone-acoustic") {
    return (
      <Card className="!bg-slate-900/60" title={
        <div className="flex items-center justify-between w-full">
          <span>{widget.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-600 normal-case tracking-normal">{widget.source}</span>
            <button onClick={onUnpin} className="text-slate-600 hover:text-slate-400 transition-colors"><X size={12} /></button>
          </div>
        </div>
      }>
        <div className="grid grid-cols-3 gap-3 text-center mt-1">
          <div><div className="text-[10px] font-mono text-slate-500">EVENTS</div><div className="text-lg font-mono text-slate-200">12</div><div className="text-[9px] text-slate-500">last 24h</div></div>
          <div><div className="text-[10px] font-mono text-slate-500">SPL AVG</div><div className="text-lg font-mono text-slate-200">118</div><div className="text-[9px] text-slate-500">dB re 1μPa</div></div>
          <div><div className="text-[10px] font-mono text-slate-500">RECORDING</div><div className="text-lg font-mono text-emerald-400">94%</div><div className="text-[9px] text-slate-500">effort</div></div>
        </div>
      </Card>
    );
  }

  if (widget.type === "alert" || widget.id === "alerts-recent") {
    return (
      <Card className="!bg-slate-900/60" title={
        <div className="flex items-center justify-between w-full">
          <span>{widget.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-600 normal-case tracking-normal">{widget.source}</span>
            <button onClick={onUnpin} className="text-slate-600 hover:text-slate-400 transition-colors"><X size={12} /></button>
          </div>
        </div>
      }>
        <div className="space-y-2 text-xs mt-1">
          <div className="flex justify-between items-center"><span className="text-slate-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-400" /> Critical</span><span className="font-mono text-slate-200">2</span></div>
          <div className="flex justify-between items-center"><span className="text-slate-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /> Warnings</span><span className="font-mono text-slate-200">7</span></div>
          <div className="flex justify-between items-center"><span className="text-slate-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-400" /> Info</span><span className="font-mono text-slate-200">14</span></div>
        </div>
      </Card>
    );
  }

  // Generic metric widget
  return (
    <Card className="!bg-slate-900/60" title={
      <div className="flex items-center justify-between w-full">
        <span>{widget.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-slate-600 normal-case tracking-normal">{widget.source}</span>
          <button onClick={onUnpin} className="text-slate-600 hover:text-slate-400 transition-colors"><X size={12} /></button>
        </div>
      </div>
    }>
      <div className="flex items-center justify-between mt-1">
        <div className="text-2xl font-mono text-slate-100">
          {widget.id === "telemetry-packet-rate" ? "99.8%" : widget.id === "health-battery" ? "12.4V" : "—"}
        </div>
        <StatusBadge status="success">{widget.id === "telemetry-packet-rate" ? "Excellent" : "Nominal"}</StatusBadge>
      </div>
    </Card>
  );
}
