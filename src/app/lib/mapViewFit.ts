import L from "leaflet";
import {
  BRIGHTON_MARINA_REF,
  BRIGHTON_TEST_POINT,
  type MapConfig,
} from "./mapConfig";

/** Shoreline / land context north-east of test site (deployment config). */
export const DEPLOYMENT_COAST_CONTEXT: [number, number] = [50.8125, -0.1185];

export type DeploymentMapFitInput = {
  buoyLat: number;
  buoyLon: number;
  marinaRef?: [number, number];
  testPoint?: [number, number];
  uncertaintyRadiusM?: number;
};

function circleBoundsPoints(center: [number, number], radiusM: number): [number, number][] {
  const dLat = radiusM / 111_320;
  const dLon = radiusM / (111_320 * Math.cos((center[0] * Math.PI) / 180));
  return [
    [center[0] + dLat, center[1]],
    [center[0] - dLat, center[1]],
    [center[0], center[1] + dLon],
    [center[0], center[1] - dLon],
  ];
}

export function deploymentContextLatLngs(input: DeploymentMapFitInput): L.LatLngExpression[] {
  const test = input.testPoint ?? [input.buoyLat, input.buoyLon];
  const marina = input.marinaRef ?? BRIGHTON_MARINA_REF;
  const radius = input.uncertaintyRadiusM ?? 50;
  return [
    [input.buoyLat, input.buoyLon],
    test,
    marina,
    DEPLOYMENT_COAST_CONTEXT,
    ...circleBoundsPoints(test, radius),
  ];
}

export type DeploymentMapFitOptions = {
  padRatio?: number;
  padding?: [number, number];
  maxZoom?: number;
};

/** Fit map to buoy, marina, anchor radius, and coastline context — replay/demo views. */
export function fitMapToDeploymentContext(
  map: L.Map,
  input: DeploymentMapFitInput,
  options?: DeploymentMapFitOptions,
): void {
  const bounds = L.latLngBounds(deploymentContextLatLngs(input));
  map.fitBounds(bounds.pad(options?.padRatio ?? 0.4), {
    padding: options?.padding ?? [80, 80],
    maxZoom: options?.maxZoom ?? 14,
    animate: false,
  });
}

export function deploymentFitInputFromConfig(
  mapConfig: MapConfig,
  buoy?: { lat: number; lon: number } | null,
): DeploymentMapFitInput {
  return {
    buoyLat: buoy?.lat ?? mapConfig.center[0],
    buoyLon: buoy?.lon ?? mapConfig.center[1],
    marinaRef: mapConfig.marinaRef ?? BRIGHTON_MARINA_REF,
    testPoint: mapConfig.testPoint ?? BRIGHTON_TEST_POINT,
    uncertaintyRadiusM: mapConfig.uncertaintyRadiusM ?? 50,
  };
}
