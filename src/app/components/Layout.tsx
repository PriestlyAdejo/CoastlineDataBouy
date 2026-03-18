import { Outlet, NavLink, useLocation } from "react-router";
import {
  Activity, Radio, LayoutDashboard, Waves, Cpu, Database, Bell, Settings,
  FileText, MapPin, Thermometer, Heart, Download, Compass, BookOpen,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

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

function NavSection({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(group.defaultOpen ?? true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition-colors"
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
                    ? "bg-slate-800 text-cyan-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
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

export function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  const isFullScreen = isDashboard || location.pathname === "/map";

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-sans selection:bg-cyan-500/30">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0">
        <div className="flex h-14 shrink-0 items-center gap-2.5 px-4 border-b border-slate-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Radio size={15} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-wide text-slate-100 uppercase">Project Nereus</span>
            <span className="text-[10px] font-mono text-slate-500">v0.4.0-alpha</span>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto space-y-1">
          {navGroups.map((group) => (
            <NavSection key={group.label} group={group} />
          ))}
        </nav>

        {/* System status footer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <div className="absolute top-0 left-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-slate-500">SYS_STATUS</span>
              <span className="text-[10px] font-semibold text-emerald-400">ONLINE — BY-04-A</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-600">
            <span>BATT: 87%</span>
            <span>LoRa: OK</span>
            <span>GPS: FIX</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/30 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">Active Node:</span>
            <div className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
              BY-04-A
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-mono text-slate-500">Last sync: 12s ago</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="text-[10px] font-mono text-slate-600">17 Mar 2026 14:32 GMT</span>
            <NavLink to="/alerts" className="hover:text-slate-200 transition-colors relative">
              <Bell size={16} />
              <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-slate-950"></span>
            </NavLink>
            <NavLink to="/settings" className="hover:text-slate-200 transition-colors">
              <Settings size={16} />
            </NavLink>
          </div>
        </header>
        <div className={clsx(
          "flex-1 overflow-hidden",
          !isFullScreen && "overflow-y-auto bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwZjE3MmEiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMWUyOTNiIi8+PC9zdmc+')]"
        )}>
          {isFullScreen ? (
            <Outlet />
          ) : (
            <div className="mx-auto max-w-7xl px-8 py-6">
              <Outlet />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}