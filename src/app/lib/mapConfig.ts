import { isBrightonDemo } from "./demoMode";

export type MapConfig = {
  center: [number, number];
  zoom: number;
  tileUrl: string;
  attribution: string;
  showAttribution: boolean;
  marinaRef?: [number, number];
  testPoint?: [number, number];
  uncertaintyRadiusM?: number;
};

const CLYDE_CENTER: [number, number] = [55.65, -5.15];
const BRIGHTON_TEST: [number, number] = [50.80675, -0.12635];
const BRIGHTON_MARINA: [number, number] = [50.808166, -0.124052];

export function getDefaultMapConfig(): MapConfig {
  return {
    center: CLYDE_CENTER,
    zoom: 10,
    tileUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    showAttribution: false,
  };
}

export function getBrightonMapConfig(): MapConfig {
  return {
    center: [50.8098, -0.1215],
    zoom: 14,
    tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    showAttribution: true,
    marinaRef: BRIGHTON_MARINA,
    testPoint: BRIGHTON_TEST,
    uncertaintyRadiusM: 50,
  };
}

export function getActiveMapConfig(): MapConfig {
  return isBrightonDemo() ? getBrightonMapConfig() : getDefaultMapConfig();
}

export const BRIGHTON_TEST_POINT = BRIGHTON_TEST;
export const BRIGHTON_MARINA_REF = BRIGHTON_MARINA;
