import { createContext, useContext, type ReactNode } from "react";
import { useLiveNodeSnapshot } from "../hooks/useLiveNodeSnapshot";

const LiveNodeContext = createContext<ReturnType<typeof useLiveNodeSnapshot> | null>(null);

/**
 * Provider for live API node snapshots.
 */
export function LiveNodeProvider({ children }: { children: ReactNode }) {
  const value = useLiveNodeSnapshot("ucl-buoy");
  return <LiveNodeContext.Provider value={value}>{children}</LiveNodeContext.Provider>;
}

export function useLiveNode() {
  return useContext(LiveNodeContext);
}
