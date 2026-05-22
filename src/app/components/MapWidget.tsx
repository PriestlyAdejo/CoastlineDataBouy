import L from 'leaflet';
import { useRef, useEffect } from 'react';
import { Maximize2, Minimize2, MapPin, Radio, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { StatusBadge } from './Widgets';
import { createPortal } from 'react-dom';
import { attachLeafletResizeHandlers } from '../lib/leafletResize';
import { NEREUS_DARK_BASEMAP } from '../lib/basemap';
import { nereusLeafletMapOptions } from '../lib/leafletMapOptions';
import { getActiveMapConfig } from '../lib/mapConfig';
import { isBrightonDemo } from '../lib/demoMode';

// Fix leaflet default icon issue in react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon for Main Node
const nodeIcon = L.divIcon({
  className: 'custom-node-icon',
  html: `<div class="relative flex items-center justify-center w-6 h-6">
           <div class="absolute w-full h-full rounded-full bg-cyan-500/40 animate-map-ping"></div>
           <div class="w-3.5 h-3.5 rounded-full bg-cyan-400 border-[2.5px] border-slate-900 z-10 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Custom Icon for Secondary Nodes
const secondaryIcon = L.divIcon({
  className: 'custom-secondary-icon',
  html: `<div class="relative flex items-center justify-center w-5 h-5">
           <div class="w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-slate-900 z-10"></div>
         </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

const nodes = [
  { id: "BY-04-A", pos: [55.65, -5.15] as [number, number], status: "Active", main: true },
  { id: "BY-02-B", pos: [55.68, -5.05] as [number, number], status: "Standby", main: false },
  { id: "BY-01-C", pos: [55.59, -5.22] as [number, number], status: "Maintenance", main: false },
];

function LeafletMapView({ mapKey }: { mapKey: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapInstanceRef.current) return;

    const mapCfg = getActiveMapConfig();
    const centerPos = mapCfg.center;
    const map = L.map(el, {
      ...nereusLeafletMapOptions,
      center: centerPos,
      zoom: mapCfg.zoom,
      zoomControl: false,
      attributionControl: false,
    });
    map.getContainer().style.background = '#0f172a';

    const tile = isBrightonDemo()
      ? { url: mapCfg.tileUrl, attribution: mapCfg.attribution }
      : NEREUS_DARK_BASEMAP;
    L.tileLayer(tile.url, {
      attribution: tile.attribution,
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    nodes.forEach(node => {
      const icon = node.main ? nodeIcon : secondaryIcon;
      const marker = L.marker(node.pos, { icon }).addTo(map);

      const statusColor = node.status === 'Active' ? '#34d399' : node.status === 'Standby' ? '#94a3b8' : '#fbbf24';
      const popupHtml = `
        <div style="font-family:monospace;min-width:140px">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;padding-bottom:8px;margin-bottom:8px">
            <strong style="color:#22d3ee">${node.id}</strong>
            <span style="color:${statusColor};font-size:10px">${node.status}</span>
          </div>
          <div style="font-size:11px;color:#cbd5e1">
            <div style="display:flex;justify-content:space-between"><span style="color:#64748b">LAT:</span><span>${node.pos[0].toFixed(4)}° N</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:#64748b">LON:</span><span>${node.pos[1].toFixed(4)}° W</span></div>
            ${node.main ? `<div style="display:flex;justify-content:space-between;margin-top:4px;padding-top:4px;border-top:1px solid #1e293b"><span style="color:#64748b">DEPTH:</span><span>42.5m</span></div>` : ''}
          </div>
        </div>`;
      marker.bindPopup(popupHtml, { className: 'custom-popup' });
    });

    mapInstanceRef.current = map;
    const detachResize = attachLeafletResizeHandlers(map, el);

    return () => {
      detachResize();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapKey]);

  return <div ref={containerRef} className="h-full min-h-0 w-full flex-1" />;
}

interface MapWidgetProps {
  expanded: boolean;
  onToggleExpand: () => void;
}

export function MapWidget({ expanded, onToggleExpand }: MapWidgetProps) {
  if (expanded) {
    return (
      <>
        {/* Placeholder to maintain layout flow when expanded */}
        <div className="relative w-full h-48 rounded-lg border border-slate-700 border-dashed bg-slate-800/30 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <MapPin size={24} className="opacity-50" />
            <span className="text-sm font-mono tracking-tight">MAP ACTIVE IN OVERLAY</span>
          </div>
        </div>
        
        {/* Fullscreen map portal to avoid clipping and CSS context issues */}
        {createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" onClick={onToggleExpand} />
            
            <div className="relative z-10 flex h-[85vh] max-h-[900px] w-full max-w-6xl min-h-[280px] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200">
              <LeafletMapView mapKey="expanded-map" />
              
              {/* Expand/Collapse Button */}
              <button 
                onClick={onToggleExpand}
                className="absolute top-4 right-4 z-[400] p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-700 transition-colors backdrop-blur-md shadow-lg"
                title="Minimize Map"
              >
                <Minimize2 size={18} />
              </button>

              {/* Mock Telemetry Overlay when Expanded */}
              <div className="absolute top-4 left-4 z-[400] w-64 flex flex-col gap-3 pointer-events-none">
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-lg shadow-lg pointer-events-auto">
                  <h3 className="text-sm font-semibold tracking-wide text-slate-100 uppercase flex items-center gap-2 mb-3">
                    <MapPin size={16} className="text-cyan-500" /> Map Controls
                  </h3>
                  <div className="space-y-2 text-sm text-slate-300">
                     <button className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 transition-colors">
                        <Activity size={14} /> Show Drift History
                     </button>
                     <button className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 transition-colors">
                        <Radio size={14} /> Ping All Nodes
                     </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-700 z-0 group">
      <LeafletMapView mapKey="inline-map" />
      
      <button 
        onClick={onToggleExpand}
        className="absolute top-3 right-3 z-[400] p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-700 transition-colors backdrop-blur-md shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Expand Map"
      >
        <Maximize2 size={18} />
      </button>
    </div>
  );
}
