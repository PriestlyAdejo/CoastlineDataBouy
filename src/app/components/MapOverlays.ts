import L from "leaflet";

// Wave height heatmap - grid of colored circles
export function createWaveHeightOverlay(map: L.Map): L.LayerGroup {
  const group = L.layerGroup();
  const center = [55.65, -5.15];
  const gridSize = 12;
  const step = 0.025;

  for (let i = -gridSize; i <= gridSize; i++) {
    for (let j = -gridSize; j <= gridSize; j++) {
      const lat = center[0] + i * step;
      const lng = center[1] + j * step;
      const dist = Math.sqrt(i * i + j * j);
      // Wave height varies by position - higher to NW
      const waveH = 0.8 + (i * 0.08) + (j * -0.05) + Math.sin(dist * 0.4) * 0.3;
      const clamped = Math.max(0.5, Math.min(3.5, waveH));
      const norm = (clamped - 0.5) / 3.0;
      // Cyan-to-rose gradient
      const r = Math.floor(norm * 200 + 20);
      const g = Math.floor((1 - norm) * 180 + 40);
      const b = Math.floor((1 - norm * 0.6) * 200 + 50);
      const color = `rgb(${r},${g},${b})`;

      L.circleMarker([lat, lng], {
        radius: 8,
        color: "transparent",
        fillColor: color,
        fillOpacity: 0.25,
        interactive: false,
      }).addTo(group);
    }
  }
  return group;
}

// Current vectors - arrows showing direction and speed
export function createCurrentVectorsOverlay(map: L.Map): L.LayerGroup {
  const group = L.layerGroup();
  const center = [55.65, -5.15];
  const gridSize = 6;
  const step = 0.05;

  for (let i = -gridSize; i <= gridSize; i++) {
    for (let j = -gridSize; j <= gridSize; j++) {
      const lat = center[0] + i * step;
      const lng = center[1] + j * step;
      // Current flows generally SSE with some variation
      const angle = 150 + Math.sin(i * 0.5) * 30 + Math.cos(j * 0.3) * 20;
      const speed = 0.15 + Math.random() * 0.25;
      const length = speed * 0.015;
      const rad = (angle * Math.PI) / 180;
      const endLat = lat + Math.cos(rad) * length;
      const endLng = lng + Math.sin(rad) * length;
      const opacity = 0.3 + speed * 1.2;

      // Arrow shaft
      L.polyline([[lat, lng], [endLat, endLng]], {
        color: "#06b6d4",
        weight: 1.5,
        opacity: Math.min(opacity, 0.7),
        interactive: false,
      }).addTo(group);

      // Arrowhead
      const headLen = length * 0.35;
      const headAngle1 = rad + (150 * Math.PI) / 180;
      const headAngle2 = rad - (150 * Math.PI) / 180;
      L.polyline([
        [endLat + Math.cos(headAngle1) * headLen, endLng + Math.sin(headAngle1) * headLen],
        [endLat, endLng],
        [endLat + Math.cos(headAngle2) * headLen, endLng + Math.sin(headAngle2) * headLen],
      ], {
        color: "#06b6d4",
        weight: 1.5,
        opacity: Math.min(opacity, 0.7),
        interactive: false,
      }).addTo(group);
    }
  }
  return group;
}

// Wind overlay - sparse directional arrows
export function createWindOverlay(map: L.Map): L.LayerGroup {
  const group = L.layerGroup();
  const center = [55.65, -5.15];
  const gridSize = 4;
  const step = 0.08;

  for (let i = -gridSize; i <= gridSize; i++) {
    for (let j = -gridSize; j <= gridSize; j++) {
      const lat = center[0] + i * step;
      const lng = center[1] + j * step;
      // NW wind
      const angle = 315 + Math.sin(i * 0.3) * 15;
      const speed = 10 + Math.random() * 8;
      const length = 0.018 + (speed / 100) * 0.01;
      const rad = (angle * Math.PI) / 180;
      const endLat = lat + Math.cos(rad) * length;
      const endLng = lng + Math.sin(rad) * length;

      L.polyline([[lat, lng], [endLat, endLng]], {
        color: "#a78bfa",
        weight: 1.5,
        opacity: 0.5,
        interactive: false,
      }).addTo(group);

      const headLen = length * 0.3;
      const ha1 = rad + (150 * Math.PI) / 180;
      const ha2 = rad - (150 * Math.PI) / 180;
      L.polyline([
        [endLat + Math.cos(ha1) * headLen, endLng + Math.sin(ha1) * headLen],
        [endLat, endLng],
        [endLat + Math.cos(ha2) * headLen, endLng + Math.sin(ha2) * headLen],
      ], {
        color: "#a78bfa",
        weight: 1.5,
        opacity: 0.5,
        interactive: false,
      }).addTo(group);
    }
  }
  return group;
}

// Storm warning zone
export function createStormWarningOverlay(map: L.Map): L.LayerGroup {
  const group = L.layerGroup();
  // A storm warning zone to the NW
  L.polygon([
    [55.80, -5.50], [55.85, -5.20], [55.78, -5.00], [55.72, -5.10], [55.74, -5.40],
  ], {
    color: "#f43f5e",
    fillColor: "#f43f5e",
    fillOpacity: 0.08,
    weight: 1.5,
    dashArray: "6 4",
    interactive: false,
  }).addTo(group);

  // Label marker
  L.marker([55.79, -5.25], {
    icon: L.divIcon({
      className: "storm-label",
      html: `<div style="background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.3);border-radius:4px;padding:2px 6px;font-family:monospace;font-size:9px;color:#fb7185;white-space:nowrap;backdrop-filter:blur(4px)">⚠ STORM WARNING ZONE</div>`,
      iconSize: [140, 20],
      iconAnchor: [70, 10],
    }),
    interactive: false,
  }).addTo(group);

  return group;
}

// Marine Protected Areas - detailed polygons with hatching effect
export function createMPAOverlay(map: L.Map): L.LayerGroup {
  const group = L.layerGroup();

  // Main MPA polygon
  L.polygon([
    [55.60, -5.25], [55.62, -5.30], [55.66, -5.28],
    [55.68, -5.22], [55.65, -5.17], [55.61, -5.18],
  ], {
    color: "#22d3ee",
    fillColor: "#22d3ee",
    fillOpacity: 0.06,
    weight: 1.5,
    dashArray: "8 4",
  }).bindPopup(`<div style="font-family:monospace;font-size:11px;color:#94a3b8">
    <strong style="color:#22d3ee">Firth of Clyde MPA</strong><br/>
    <span style="color:#64748b">Source:</span> JNCC MPA Network<br/>
    <span style="color:#64748b">Status:</span> Designated<br/>
    <span style="color:#64748b">Features:</span> Seabed habitats, horse mussel beds
  </div>`, { className: "custom-popup" }).addTo(group);

  // Secondary smaller zone
  L.polygon([
    [55.70, -5.08], [55.72, -5.12], [55.74, -5.06], [55.72, -5.02],
  ], {
    color: "#22d3ee",
    fillColor: "#22d3ee",
    fillOpacity: 0.04,
    weight: 1,
    dashArray: "4 3",
  }).bindPopup(`<div style="font-family:monospace;font-size:11px;color:#94a3b8">
    <strong style="color:#22d3ee">Coastal Sensitivity Zone</strong><br/>
    <span style="color:#64748b">Source:</span> NatureScot<br/>
    <span style="color:#64748b">Status:</span> Advisory
  </div>`, { className: "custom-popup" }).addTo(group);

  // MPA label
  L.marker([55.635, -5.23], {
    icon: L.divIcon({
      className: "mpa-label",
      html: `<div style="background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.2);border-radius:4px;padding:2px 6px;font-family:monospace;font-size:9px;color:#67e8f9;white-space:nowrap;backdrop-filter:blur(4px)">MPA — Firth of Clyde</div>`,
      iconSize: [130, 20],
      iconAnchor: [65, 10],
    }),
    interactive: false,
  }).addTo(group);

  return group;
}

// Wildlife / habitat distribution overlay
export function createHabitatOverlay(map: L.Map): L.LayerGroup {
  const group = L.layerGroup();

  // Habitat probability zones as gradient circles
  const zones = [
    { center: [55.62, -5.20] as [number, number], radius: 2500, label: "Horse Mussel Beds" },
    { center: [55.67, -5.10] as [number, number], radius: 1800, label: "Maerl Habitat" },
    { center: [55.58, -5.18] as [number, number], radius: 2200, label: "Seagrass Zone" },
  ];

  zones.forEach(z => {
    L.circle(z.center, {
      radius: z.radius,
      color: "#34d399",
      fillColor: "#34d399",
      fillOpacity: 0.06,
      weight: 1,
      dashArray: "4 4",
    }).bindPopup(`<div style="font-family:monospace;font-size:11px;color:#94a3b8">
      <strong style="color:#34d399">${z.label}</strong><br/>
      <span style="color:#64748b">Source:</span> EMODnet Seabed Habitats<br/>
      <span style="color:#64748b">Confidence:</span> Moderate
    </div>`, { className: "custom-popup" }).addTo(group);
  });

  // Cetacean activity zone
  L.circle([55.64, -5.28], {
    radius: 3500,
    color: "#f59e0b",
    fillColor: "#f59e0b",
    fillOpacity: 0.04,
    weight: 1,
    dashArray: "6 3",
  }).bindPopup(`<div style="font-family:monospace;font-size:11px;color:#94a3b8">
    <strong style="color:#fbbf24">Cetacean Activity Zone</strong><br/>
    <span style="color:#64748b">Source:</span> JNCC Marine Atlas<br/>
    <span style="color:#64748b">Species:</span> Harbour porpoise (seasonal)
  </div>`, { className: "custom-popup" }).addTo(group);

  return group;
}

// Sea surface temperature overlay
export function createSSTOverlay(map: L.Map): L.LayerGroup {
  const group = L.layerGroup();
  const center = [55.65, -5.15];
  const gridSize = 10;
  const step = 0.03;

  for (let i = -gridSize; i <= gridSize; i++) {
    for (let j = -gridSize; j <= gridSize; j++) {
      const lat = center[0] + i * step;
      const lng = center[1] + j * step;
      // SST gradient - warmer nearshore, cooler offshore
      const sst = 14.3 + (j * 0.08) - Math.abs(i) * 0.03 + Math.sin(i * 0.5 + j * 0.3) * 0.3;
      const norm = (sst - 12.5) / 3.5;
      const clamped = Math.max(0, Math.min(1, norm));
      // Blue to yellow-orange
      const r = Math.floor(clamped * 220 + 20);
      const g = Math.floor(clamped * 160 + 60);
      const b = Math.floor((1 - clamped) * 200 + 40);

      L.circleMarker([lat, lng], {
        radius: 9,
        color: "transparent",
        fillColor: `rgb(${r},${g},${b})`,
        fillOpacity: 0.18,
        interactive: false,
      }).addTo(group);
    }
  }
  return group;
}

// Deployment suitability zones
export function createDeploymentZoneOverlay(map: L.Map): L.LayerGroup {
  const group = L.layerGroup();

  // Safe zone
  L.polygon([
    [55.58, -5.35], [55.58, -4.95], [55.74, -4.95], [55.74, -5.35],
  ], {
    color: "#475569",
    fillColor: "#475569",
    fillOpacity: 0.03,
    weight: 1,
    dashArray: "8 4",
  }).addTo(group);

  // Exclusion zone
  L.polygon([
    [55.56, -5.40], [55.55, -5.30], [55.57, -5.25], [55.58, -5.35],
  ], {
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.06,
    weight: 1,
    dashArray: "4 4",
  }).bindPopup(`<div style="font-family:monospace;font-size:11px;color:#94a3b8">
    <strong style="color:#ef4444">Restricted Zone</strong><br/>
    <span style="color:#64748b">Type:</span> Shipping lane proximity<br/>
    <span style="color:#64748b">Status:</span> No deployment
  </div>`, { className: "custom-popup" }).addTo(group);

  return group;
}

// Buoy tracks - historical drift lines
export function createBuoyTracksOverlay(
  map: L.Map,
  nodes: { id: string; pos: [number, number]; status: string }[]
): L.LayerGroup {
  const group = L.layerGroup();

  nodes.forEach((node, idx) => {
    // Generate a fake 7-day track
    const points: [number, number][] = [];
    let lat = node.pos[0];
    let lng = node.pos[1];
    for (let t = 0; t < 20; t++) {
      lat += (Math.random() - 0.5) * 0.002;
      lng += (Math.random() - 0.5) * 0.002;
      points.push([lat, lng]);
    }
    points.reverse();
    points.push(node.pos);

    const colors = ["#06b6d4", "#94a3b8", "#fbbf24", "#06b6d4"];
    L.polyline(points, {
      color: colors[idx % colors.length],
      weight: 1.5,
      opacity: 0.4,
      dashArray: "4 3",
      interactive: false,
    }).addTo(group);
  });

  return group;
}

// Anchor radius circles
export function createAnchorRadiusOverlay(
  map: L.Map,
  nodes: { id: string; pos: [number, number]; status: string }[]
): L.LayerGroup {
  const group = L.layerGroup();
  nodes.forEach(node => {
    if (node.status !== "Maintenance") {
      L.circle(node.pos, {
        radius: 200,
        color: "#334155",
        fillColor: "#334155",
        fillOpacity: 0.08,
        weight: 1,
        dashArray: "3 3",
        interactive: false,
      }).addTo(group);
    }
  });
  return group;
}
