import { NavLink, useLocation, useOutlet } from "react-router";
import {
  Activity, Radio, LayoutDashboard, Waves, Cpu, Database, Bell, Settings,
  FileText, MapPin, Thermometer, Heart, Download, Compass, BookOpen,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import {
  getActiveNodeDisplayName,
  getActiveNodeLabel,
  getReplayModeLabel,
  isBrightonDemo,
} from "../lib/demoMode";
import { isShowcaseSession } from "../lib/showcaseMode";
import { useDeploymentView } from "../hooks/useDeploymentView";
import { DataQualityIndicator } from "./DataQualityIndicator";
import { ReplayControlPanel } from "./ReplayControlPanel";
import { useLiveNode } from "./LiveNodeProvider";

interface NavItem {
  name: string;
  path: string;
  icon: any;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: "Monitoring",
    defaultOpen: true,
    items: [
      { name: "Overview", path: "/", icon: LayoutDashboard },
      { name: "Telemetry", path: "/telemetry", icon: Activity },
      { name: "Hydrophone", path: "/hydrophone", icon: Waves },
      { name: "Environment", path: "/environment", icon: Thermometer },
      { name: "Location / Map", path: "/map", icon: MapPin },
      { name: "System Health", path: "/system-health", icon: Heart },
      { name: "Alerts", path: "/alerts", icon: Bell, badge: "3" },
    ],
  },
  {
    label: "Data & Files",
    defaultOpen: true,
    items: [
      { name: "Historical Data", path: "/data", icon: Database },
      { name: "Files / Downloads", path: "/files", icon: Download },
    ],
  },
  {
    label: "Tools & Reference",
    defaultOpen: false,
    items: [
      { name: "Deployment Tools", path: "/deployment", icon: Compass },
      { name: "Documentation", path: "/docs", icon: BookOpen },
      { name: "Settings", path: "/settings", icon: Settings },
      { name: "Design System", path: "/design-system", icon: FileText },
    ],
  },
];

function buildNavGroups(alertBadge: string): NavGroup[] {
  return navGroups.map((g) => ({
    ...g,
    items: g.items.map((item) =>
      item.path === "/alerts" ? { ...item, badge: alertBadge } : item,
    ),
  }));
}

function NavSection({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(group.defaultOpen ?? true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold dash-text-faint uppercase tracking-wider hover:dash-text-secondary transition-colors"
      >
        {group.label}
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="space-y-0.5 mt-0.5">
          {group.items.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                clsx(
                  "group flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "text-[var(--dash-accent)] dash-panel-bg border dash-border"
                    : "dash-text-secondary hover:dash-text-primary",
                )
              }
            >
              <div className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cyan-500/15 px-1.5 text-[10px] font-mono text-cyan-400 border border-cyan-500/20">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

const HANDOVER_READABLE_KEY = "nereus.handoverReadable";

export function Layout() {
  const location = useLocation();
  const outlet = useOutlet();
  const isDashboard = location.pathname === "/";
  const isFullScreen = isDashboard || location.pathname === "/map";
  const [handoverReadable, setHandoverReadable] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem("nereus.handover") === "1" ||
      window.localStorage.getItem("nereus.showcase") === "1" ||
      window.localStorage.getItem(HANDOVER_READABLE_KEY) === "1"
    );
  });

  useEffect(() => {
    document.documentElement.classList.toggle("handover-readable", handoverReadable);
    window.localStorage.setItem(HANDOVER_READABLE_KEY, handoverReadable ? "1" : "0");
  }, [handoverReadable]);

  const activeNode = getActiveNodeLabel();
  const activeDisplay = getActiveNodeDisplayName();
  const vm = useDeploymentView();
  const live = useLiveNode();
  const sidebar = vm?.sidebar;
  const alertCount = vm ? vm.alerts.filter((a) => !a.acknowledged).length : 3;
  const groups = buildNavGroups(String(alertCount));
  const headerTime = isBrightonDemo()
    ? (vm?.display.testTimeBst ?? "1 May 2026")
    : "17 Mar 2026 14:32 GMT";

  const modeBadgeStyle = isBrightonDemo()
    ? { backgroundColor: "var(--dash-badge-replay-bg)", color: "var(--dash-badge-replay-text)", borderColor: "var(--dash-warning)" }
    : live?.modeLabel === "LIVE API"
      ? { backgroundColor: "var(--dash-badge-live-bg)", color: "var(--dash-badge-live-text)", borderColor: "var(--dash-success)" }
      : live?.modeLabel === "API OFFLINE" || live?.modeLabel === "STALE LIVE DATA"
        ? { backgroundColor: "var(--dash-badge-offline-bg)", color: "var(--dash-badge-offline-text)", borderColor: "var(--dash-error)" }
        : { backgroundColor: "var(--dash-badge-neutral-bg)", color: "var(--dash-badge-neutral-text)", borderColor: "var(--dash-panel-border)" };

  return (
    <div
      className="dash-shell flex h-screen font-sans selection:bg-cyan-500/30 dash-text-secondary"
      style={{ backgroundColor: "var(--dash-bg)", color: "var(--dash-text-secondary)" }}
    >
      {/* Sidebar */}
      <aside
        className="w-60 flex flex-col border-r shrink-0 dash-sidebar-bg"
        style={{ backgroundColor: "var(--dash-sidebar-bg)", borderColor: "var(--dash-panel-border)" }}
      >
        <div className="flex h-14 shrink-0 items-center gap-2.5 px-4 border-b" style={{ borderColor: "var(--dash-panel-border)" }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Radio size={15} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-wide dash-text-primary uppercase">Project Nereus</span>
            <span className="text-[10px] font-mono dash-text-faint">v0.4.0-alpha</span>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto space-y-1">
          {groups.map((group) => (
            <NavSection key={group.label} group={group} />
          ))}
        </nav>

        {/* System status footer */}
        <div className="p-3 border-t space-y-2" style={{ borderColor: "var(--dash-panel-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <div className="absolute top-0 left-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono dash-text-faint">SYS_STATUS</span>
              <span className="text-[10px] font-semibold text-[var(--dash-success)]">ONLINE — {activeNode}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono dash-text-faint">
            <span>BATT: {sidebar?.battery ?? "87%"}</span>
            <span>{isBrightonDemo() ? `PHASE: ${sidebar?.phase ?? "—"}` : "LoRa: OK"}</span>
            <span>
              {isBrightonDemo()
                ? "GPS: BRIGHTON REPLAY"
                : live?.locationView?.kind === "live_gnss_fix"
                  ? "GPS: LIVE FIX"
                  : live?.locationView?.kind === "approximate_ip_fallback"
                    ? "GPS: APPROX"
                    : live?.locationView?.kind === "no_gnss_device"
                      ? "GPS: NO DEVICE"
                      : live?.locationView?.kind === "gnss_waiting_fix"
                        ? "GPS: WAIT FIX"
                        : "GPS: NO FIX"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className="flex h-12 shrink-0 items-center justify-between border-b px-6"
          style={{ backgroundColor: "var(--dash-header-bg)", borderColor: "var(--dash-panel-border)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono dash-text-faint">Active Node:</span>
            <div className="px-2 py-0.5 rounded text-xs font-mono font-medium dash-panel-bg dash-text-primary border dash-border">
              {activeDisplay}
            </div>
            {isBrightonDemo() && <ReplayControlPanel compact />}
            {isBrightonDemo() && <DataQualityIndicator />}
            <div className="flex items-center gap-2 ml-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide border"
                style={modeBadgeStyle}
              >
                {isBrightonDemo() ? getReplayModeLabel() : (live?.modeLabel ?? "LIVE API")}
              </span>
              {isShowcaseSession() && (
                <span className="text-[10px] dash-text-faint hidden sm:inline">
                  Prototype replay mode — live Pi not required
                </span>
              )}
              {!isBrightonDemo() && live?.locationView && (
                <span className="text-xs dash-text-secondary">{live.locationView.label}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 dash-text-secondary">
            <span className="text-[10px] font-mono dash-text-faint">{headerTime}</span>
            <NavLink to="/alerts" className="hover:dash-text-primary transition-colors relative">
              <Bell size={16} />
              <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-slate-950"></span>
            </NavLink>
            <button
              type="button"
              onClick={() => setHandoverReadable((v) => !v)}
              className={clsx(
                "text-xs px-2 py-0.5 rounded border transition-colors",
                handoverReadable
                  ? "border-cyan-500/50 text-cyan-300 bg-cyan-500/10"
                  : "dash-border dash-text-secondary hover:dash-text-primary",
              )}
              title="Larger text and higher contrast for projector handover"
            >
              Readable
            </button>
            <NavLink to="/settings" className="hover:dash-text-primary transition-colors">
              <Settings size={16} />
            </NavLink>
          </div>
        </header>
        <div
          className={clsx(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            !isFullScreen &&
              "overflow-y-auto bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwZjE3MmEiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMWUyOTNiIi8+PC9zdmc+')]",
          )}
        >
          <div
            key={location.pathname}
            className={clsx(
              "min-h-0 flex-1 flex flex-col",
              isFullScreen ? "relative" : "mx-auto w-full max-w-7xl px-8 py-6",
            )}
          >
            {isFullScreen ? (
              <div className="absolute inset-0 min-h-0 overflow-hidden">{outlet}</div>
            ) : (
              <div className="min-h-0 flex-1">{outlet}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}