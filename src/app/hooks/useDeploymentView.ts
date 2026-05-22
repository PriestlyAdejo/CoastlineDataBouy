import { useMemo } from "react";
import { useBrightonReplay } from "../components/BrightonReplayContext";
import { buildDeploymentViewModel, type DeploymentViewModel } from "../lib/deploymentViewModel";
import { isBrightonDemo } from "../lib/demoMode";

/** Single deployment snapshot for Brighton replay pages; null in normal Clyde mode. */
export function useDeploymentView(): DeploymentViewModel | null {
  const ctx = useBrightonReplay();
  return useMemo(() => {
    if (!isBrightonDemo() || !ctx) return null;
    return buildDeploymentViewModel(ctx);
  }, [ctx, ctx?.snapshots, ctx?.clock, ctx?.tick, ctx?.useApiPrimary, ctx?.history.length]);
}
