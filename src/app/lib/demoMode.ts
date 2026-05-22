export const BRIGHTON_DEMO = "brighton-marina-2026-05-01";

export type NodeStatus = "Active" | "Standby" | "Maintenance";

export type DashboardNode = {
  id: string;
  displayName: string;
  pos: [number, number];
  status: NodeStatus;
  main: boolean;
  depth: string;
  battery: string;
  temp: string;
};

const BRIGHTON_CENTER: [number, number] = [50.8118, -0.1013];

const clydeNodes: DashboardNode[] = [
  { id: "BY-04-A", displayName: "BY-04-A", pos: [55.65, -5.15], status: "Active", main: true, depth: "42.5m", battery: "87%", temp: "14.3°C" },
  { id: "BY-02-B", displayName: "BY-02-B", pos: [55.68, -5.05], status: "Standby", main: false, depth: "38.1m", battery: "92%", temp: "14.1°C" },
  { id: "BY-01-C", displayName: "BY-01-C", pos: [55.59, -5.22], status: "Maintenance", main: false, depth: "45.8m", battery: "34%", temp: "13.9°C" },
  { id: "BY-03-D", displayName: "BY-03-D", pos: [55.72, -5.30], status: "Active", main: false, depth: "29.2m", battery: "78%", temp: "14.5°C" },
];

const brightonNodes: DashboardNode[] = [
  {
    id: "ucl-buoy",
    displayName: "Brighton Marina Field Test",
    pos: BRIGHTON_CENTER,
    status: "Active",
    main: true,
    depth: "—",
    battery: "—",
    temp: "—",
  },
];

export function getDemoMode(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("nereus.demoMode");
}

export function isBrightonDemo(): boolean {
  return getDemoMode() === BRIGHTON_DEMO;
}

export function getDashboardNodes(): DashboardNode[] {
  return isBrightonDemo() ? brightonNodes : clydeNodes;
}

export function getDefaultNodeId(): string {
  return isBrightonDemo() ? "ucl-buoy" : "BY-04-A";
}

export function getActiveNodeLabel(): string {
  if (isBrightonDemo()) return "ucl-buoy";
  return "BY-04-A";
}

export function getActiveNodeDisplayName(): string {
  if (isBrightonDemo()) return "Brighton Marina Field Test";
  return "BY-04-A";
}

export function getReplayBannerText(): string | null {
  return isBrightonDemo() ? "Brighton Marina replay" : null;
}

export function getSiteDescription(): string {
  if (isBrightonDemo()) return "Brighton Marina — Field test replay";
  return "Firth of Clyde — Test Area Alpha";
}

export function getSitePositionLabel(): string {
  if (isBrightonDemo()) return "50.8118°N, 0.1013°W";
  return "55.6500°N, 5.1500°W";
}

export function shouldShowClydeOverlays(): boolean {
  return !isBrightonDemo();
}

export type MapConfig = {
  center: [number, number];
  zoom: number;
  tileUrl: string;
  attribution: string;
  showAttribution: boolean;
};

export function getMapConfig(): MapConfig {
  if (isBrightonDemo()) {
    return {
      center: BRIGHTON_CENTER,
      zoom: 15,
      tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      showAttribution: true,
    };
  }
  return {
    center: [55.65, -5.15],
    zoom: 10,
    tileUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    showAttribution: false,
  };
}

export function getHydrophoneStationLabel(): string {
  return isBrightonDemo() ? "ucl-buoy Hydrophone Station" : "BY-04-A Hydrophone Station";
}

export function getPageNodeSubtitle(suffix: string): string {
  const node = getActiveNodeDisplayName();
  return `${suffix} for ${node}.`;
}
