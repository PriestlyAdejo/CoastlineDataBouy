import { getActiveMapConfig, type MapConfig } from "./mapConfig";
import { BRIGHTON_TEST_POINT, BRIGHTON_MARINA_REF } from "./mapConfig";

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

const clydeNodes: DashboardNode[] = [
  { id: "BY-04-A", displayName: "BY-04-A", pos: [55.65, -5.15], status: "Active", main: true, depth: "42.5m", battery: "87%", temp: "14.3°C" },
  { id: "BY-02-B", displayName: "BY-02-B", pos: [55.68, -5.05], status: "Standby", main: false, depth: "38.1m", battery: "92%", temp: "14.1°C" },
  { id: "BY-01-C", displayName: "BY-01-C", pos: [55.59, -5.22], status: "Maintenance", main: false, depth: "45.8m", battery: "34%", temp: "13.9°C" },
  { id: "BY-03-D", displayName: "BY-03-D", pos: [55.72, -5.30], status: "Active", main: false, depth: "29.2m", battery: "78%", temp: "14.5°C" },
];

const brightonNodes: DashboardNode[] = [
  {
    id: "ucl-buoy",
    displayName: "Field deployment",
    pos: BRIGHTON_TEST_POINT,
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
  if (isBrightonDemo()) return getDeploymentMeta().displayName;
  return "BY-04-A";
}

export type DeploymentMeta = {
  nodeId: string;
  displayName: string;
  siteName: string;
  hydrophoneLabel: string;
};

export function getDeploymentMeta(): DeploymentMeta {
  if (isBrightonDemo()) {
    return {
      nodeId: "ucl-buoy",
      displayName: "Field deployment",
      siteName: "Marina test site",
      hydrophoneLabel: "Hydrophone station",
    };
  }
  return {
    nodeId: "BY-04-A",
    displayName: "BY-04-A",
    siteName: "Firth of Clyde",
    hydrophoneLabel: "BY-04-A Hydrophone Station",
  };
}

export function getReplayBannerText(): string | null {
  return isBrightonDemo() ? "Replay mode" : null;
}

export function getSiteDescription(): string {
  if (isBrightonDemo()) return "Field test site — 1 May 2026";
  return "Firth of Clyde — Test Area Alpha";
}

export function getSitePositionLabel(): string {
  if (isBrightonDemo()) {
    const [lat, lon] = BRIGHTON_TEST_POINT;
    return `${lat.toFixed(5)}°N, ${Math.abs(lon).toFixed(5)}°W`;
  }
  return "55.6500°N, 5.1500°W";
}

export function shouldShowClydeOverlays(): boolean {
  return !isBrightonDemo();
}

export function getMapConfig(): MapConfig {
  return getActiveMapConfig();
}

export function getHydrophoneStationLabel(): string {
  return isBrightonDemo() ? getDeploymentMeta().hydrophoneLabel : "BY-04-A Hydrophone Station";
}

export function getPageNodeSubtitle(suffix: string): string {
  return suffix;
}

export { BRIGHTON_MARINA_REF, BRIGHTON_TEST_POINT };
