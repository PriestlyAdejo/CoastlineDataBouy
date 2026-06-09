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

/** Single live handover node — no Clyde demo fleet in LIVE API mode. */
const liveHandoverNodes: DashboardNode[] = [
  {
    id: "ucl-buoy",
    displayName: "UCL Buoy",
    pos: [54.0, -2.0],
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
  if (typeof window !== "undefined" && window.localStorage.getItem("nereus.handover") === "1") {
    return false;
  }
  return getDemoMode() === BRIGHTON_DEMO;
}

export function getDashboardNodes(): DashboardNode[] {
  if (isBrightonDemo()) return brightonNodes;
  return liveHandoverNodes;
}

export function getDefaultNodeId(): string {
  return "ucl-buoy";
}

export function getActiveNodeLabel(): string {
  return "ucl-buoy";
}

export function getActiveNodeDisplayName(): string {
  return getDeploymentMeta().displayName;
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
    nodeId: "ucl-buoy",
    displayName: "UCL Buoy",
    siteName: "Field deployment",
    hydrophoneLabel: "Hydrophone station",
  };
}

export function getReplayBannerText(): string | null {
  return isBrightonDemo() ? "Replay mode" : null;
}

export function getReplayModeLabel(): string {
  return "BRIGHTON MARINA REPLAY";
}

export function getSiteDescription(): string {
  if (isBrightonDemo()) return "Field test site — 1 May 2026";
  return "Live field deployment — GNSS when available";
}

export function getSitePositionLabel(): string {
  if (isBrightonDemo()) {
    const [lat, lon] = BRIGHTON_TEST_POINT;
    return `${lat.toFixed(5)}°N, ${Math.abs(lon).toFixed(5)}°W`;
  }
  return "Awaiting live GNSS fix";
}

export function shouldShowClydeOverlays(): boolean {
  return false;
}

export function getMapConfig(): MapConfig {
  return getActiveMapConfig();
}

export function getHydrophoneStationLabel(): string {
  return getDeploymentMeta().hydrophoneLabel;
}

export function getPageNodeSubtitle(suffix: string): string {
  return suffix;
}

export { BRIGHTON_MARINA_REF, BRIGHTON_TEST_POINT };
