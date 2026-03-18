import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface PinnedWidget {
  id: string;
  source: string; // which page it came from
  label: string;
  type: "metric" | "chart" | "status" | "alert" | "environmental" | "acoustic";
}

const defaultPins: PinnedWidget[] = [
  { id: "telemetry-packet-rate", source: "Telemetry", label: "Packet Delivery Rate", type: "metric" },
  { id: "env-water-temp", source: "Environment", label: "Water Temperature (24h)", type: "chart" },
  { id: "health-battery", source: "System Health", label: "Battery Status", type: "metric" },
  { id: "hydrophone-acoustic", source: "Hydrophone", label: "Acoustic Activity Summary", type: "acoustic" },
  { id: "alerts-recent", source: "Alerts", label: "Recent Alerts", type: "alert" },
];

interface OverviewContextType {
  pinnedWidgets: PinnedWidget[];
  pinWidget: (widget: PinnedWidget) => void;
  unpinWidget: (id: string) => void;
  isPinned: (id: string) => boolean;
  togglePin: (widget: PinnedWidget) => void;
}

const OverviewContext = createContext<OverviewContextType>({
  pinnedWidgets: defaultPins,
  pinWidget: () => {},
  unpinWidget: () => {},
  isPinned: () => false,
  togglePin: () => {},
});

export function OverviewProvider({ children }: { children: ReactNode }) {
  const [pinnedWidgets, setPinnedWidgets] = useState<PinnedWidget[]>(defaultPins);

  const pinWidget = useCallback((widget: PinnedWidget) => {
    setPinnedWidgets(prev => {
      if (prev.some(w => w.id === widget.id)) return prev;
      return [...prev, widget];
    });
  }, []);

  const unpinWidget = useCallback((id: string) => {
    setPinnedWidgets(prev => prev.filter(w => w.id !== id));
  }, []);

  const isPinned = useCallback((id: string) => {
    return pinnedWidgets.some(w => w.id === id);
  }, [pinnedWidgets]);

  const togglePin = useCallback((widget: PinnedWidget) => {
    setPinnedWidgets(prev => {
      if (prev.some(w => w.id === widget.id)) return prev.filter(w => w.id !== widget.id);
      return [...prev, widget];
    });
  }, []);

  return (
    <OverviewContext.Provider value={{ pinnedWidgets, pinWidget, unpinWidget, isPinned, togglePin }}>
      {children}
    </OverviewContext.Provider>
  );
}

export function useOverview() {
  return useContext(OverviewContext);
}

// Reusable pin button component
export function PinToOverviewButton({ widget, className }: { widget: PinnedWidget; className?: string }) {
  const { isPinned, togglePin } = useOverview();
  const pinned = isPinned(widget.id);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); togglePin(widget); }}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono transition-all ${
        pinned
          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
          : "bg-slate-800/60 text-slate-500 border border-slate-700 hover:text-slate-300 hover:border-slate-600"
      } ${className || ""}`}
      title={pinned ? "Remove from Overview" : "Pin to Overview"}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="17" x2="12" y2="22" />
        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
      </svg>
      {pinned ? "Pinned" : "Pin to Overview"}
    </button>
  );
}
