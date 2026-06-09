import { Card } from "../components/Card";
import { MetricCard, StatusBadge } from "../components/Widgets";
import {
  Cpu, HardDrive, Battery, Thermometer, Shield, RefreshCw,
  Activity, Zap, Pin, MemoryStick,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { clsx } from "clsx";
import { useState, useEffect } from "react";
import { PinToOverviewButton } from "../components/OverviewContext";
import { getPageNodeSubtitle, isBrightonDemo } from "../lib/demoMode";
import { useDeploymentView } from "../hooks/useDeploymentView";
import { selectChartSeries } from "../lib/replaySelectors";
import { useLiveNode } from "../components/LiveNodeProvider";

const cpuData = Array.from({ length: 60 }, (_, i) => ({
  t: `${60 - i}s`,
  cpu: 25 + Math.random() * 25,
  mem: 42 + Math.random() * 12,
}));

const batteryData = Array.from({ length: 48 }, (_, i) => ({
  time: `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
  voltage: 12.6 - (i * 0.008) + Math.random() * 0.1,
  current: 0.35 + Math.random() * 0.15,
}));

const processes = [
  { name: "hydrophone_capture", cpu: "18.2%", mem: "124 MB", status: "running" },
  { name: "telemetry_tx", cpu: "3.1%", mem: "28 MB", status: "running" },
  { name: "gps_daemon", cpu: "1.4%", mem: "12 MB", status: "running" },
  { name: "sensor_poll", cpu: "2.8%", mem: "18 MB", status: "running" },
  { name: "watchdog_svc", cpu: "0.3%", mem: "4 MB", status: "running" },
  { name: "log_rotate", cpu: "0.0%", mem: "6 MB", status: "idle" },
  { name: "wifi_manager", cpu: "0.0%", mem: "8 MB", status: "standby" },
];

function connectivityLabel(ok: boolean | undefined, okText: string, badText: string): string {
  if (ok === undefined) return "—";
  return ok ? okText : badText;
}

function modemLabel(detected: boolean | undefined): string {
  if (detected === undefined) return "—";
  return detected ? "Detected" : "Not detected";
}

function cellularStateLabel(
  modemDetected: boolean | undefined,
  state: string | undefined,
): string {
  if (modemDetected === false) return "Not applicable (no modem)";
  return state && state !== "—" ? state : "—";
}

export function SystemHealth() {
  const vm = useDeploymentView();
  const live = useLiveNode();
  const liveHealth = (live?.health ?? null) as Record<string, unknown> | null;
  const liveNetwork = liveHealth?.network && typeof liveHealth.network === "object"
    ? (liveHealth.network as Record<string, unknown>)
    : null;
  const batterySource = (liveHealth?.battery_source as string) ?? "not_available";
  const gnssLabel = live?.locationView?.label ?? "—";
  const coreConnectivityOk = Boolean(
    liveNetwork?.backend_reachable
    && (liveNetwork?.online || liveNetwork?.tailscale_ip || liveNetwork?.tailscale),
  );
  const health = vm?.health;
  const tel = vm?.telemetry;
  const storage = vm?.storage;
  const cpuChart = isBrightonDemo()
    ? selectChartSeries(vm, "cpu").map((p, i) => ({ t: p.label, cpu: p.value, mem: (vm?.health.memPct ?? 38) + Math.sin(i) * 3 }))
    : cpuData;
  const battChart = isBrightonDemo()
    ? selectChartSeries(vm, "battery").map((p) => ({ time: p.label, voltage: p.value, current: 0.35 }))
    : batteryData;
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setLiveTime(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold dash-text-primary tracking-tight">System Health</h1>
          <p className="text-slate-500 text-sm mt-1">{getPageNodeSubtitle("Embedded compute, power, storage, and watchdog monitoring")}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            status={
              isBrightonDemo()
                ? "success"
                : coreConnectivityOk
                  ? liveNetwork?.modem_detected === false || live?.locationView?.kind === "no_gnss_device"
                    ? "warning"
                    : "success"
                  : liveHealth
                    ? "warning"
                    : "neutral"
            }
          >
            {isBrightonDemo()
              ? "All Systems Nominal"
              : coreConnectivityOk
                ? liveNetwork?.modem_detected === false
                  ? "Handover OK — 4G not detected"
                  : "Handover connectivity OK"
                : liveHealth
                  ? "Connectivity degraded"
                  : "Awaiting live health"}
          </StatusBadge>
          <PinToOverviewButton widget={{ id: "health-battery", source: "System Health", label: "Battery Status", type: "metric" }} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {isBrightonDemo() && health ? (
          <>
            <MetricCard title="CPU" value={String(health.cpuPct)} unit="%" trend="neutral" trendValue="Compute module" icon={Cpu} status="success" />
            <MetricCard title="Memory" value={String(health.memPct)} unit="%" trend="neutral" trendValue="Live" icon={MemoryStick} status="success" />
            <MetricCard title="Storage Free" value={storage?.freeGb.toFixed(1) ?? health.freeGb} unit="GB" trend="neutral" trendValue={health.mountpoint} icon={HardDrive} status="normal" />
            <MetricCard title="Battery" value={tel?.packV.replace(" V", "") ?? "—"} unit="V" trend="neutral" trendValue={tel?.socPct ?? "—"} icon={Battery} status="success" />
            <MetricCard title="Phase" value={vm?.phase.label ?? health.phaseLabel} unit="" trend="neutral" trendValue="Deployment" icon={Thermometer} status="success" className="min-w-0 [&_.text-2xl]:truncate [&_.text-2xl]:text-base" />
          </>
        ) : (
          <>
            <MetricCard
              title="CPU"
              value={liveHealth?.pi && typeof liveHealth.pi === "object" ? String((liveHealth.pi as Record<string, unknown>).cpu_pct ?? "—") : "—"}
              unit="%"
              trend="neutral"
              trendValue={liveHealth ? "From Pi health" : "Awaiting live data"}
              icon={Cpu}
              status={liveHealth ? "success" : "warning"}
            />
            <MetricCard
              title="Memory"
              value={liveHealth?.pi && typeof liveHealth.pi === "object" ? String((liveHealth.pi as Record<string, unknown>).mem_pct ?? "—") : "—"}
              unit="%"
              trend="neutral"
              trendValue={liveHealth ? "From Pi health" : "Awaiting live data"}
              icon={MemoryStick}
              status={liveHealth ? "success" : "warning"}
            />
            <MetricCard
              title="Storage"
              value={
                liveHealth?.storage && typeof liveHealth.storage === "object" && (liveHealth.storage as Record<string, unknown>).free_bytes != null
                  ? `${((Number((liveHealth.storage as Record<string, unknown>).free_bytes) / (1024 ** 3))).toFixed(1)}`
                  : "—"
              }
              unit="GB free"
              trend="neutral"
              trendValue={
                liveHealth?.storage && typeof liveHealth.storage === "object"
                  ? String((liveHealth.storage as Record<string, unknown>).mountpoint ?? "SSD")
                  : "Awaiting live data"
              }
              icon={HardDrive}
              status={liveHealth ? "normal" : "warning"}
            />
            <MetricCard
              title="Battery"
              value={batterySource === "not_available" ? "—" : "—"}
              unit=""
              trend="neutral"
              trendValue={batterySource === "not_available" ? "Not connected" : batterySource}
              icon={Battery}
              status="warning"
            />
            <MetricCard
              title="Pi CPU temp"
              value={
                liveHealth?.pi && typeof liveHealth.pi === "object" && (liveHealth.pi as Record<string, unknown>).cpu_temp_c != null
                  ? String((liveHealth.pi as Record<string, unknown>).cpu_temp_c)
                  : "—"
              }
              unit="°C"
              trend="neutral"
              trendValue={liveHealth ? "Onboard sensor" : "No live sensor"}
              icon={Thermometer}
              status={liveHealth ? "success" : "warning"}
            />
          </>
        )}
      </div>

      {!isBrightonDemo() && liveNetwork && (
        <Card title="Connectivity & 4G">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-mono dash-text-secondary">
            {[
              ["Wi-Fi / Internet", connectivityLabel(liveNetwork.online as boolean | undefined, "Online", "Offline")],
              ["Backend", connectivityLabel(liveNetwork.backend_reachable as boolean | undefined, "Reachable", "Unreachable")],
              ["Tailscale", connectivityLabel(Boolean(liveNetwork.tailscale_ip ?? liveNetwork.tailscale), "Online", "Offline")],
              ["Tailscale IP", String(liveNetwork.tailscale_ip ?? liveNetwork.tailscale ?? "—")],
              ["Default route", String(liveNetwork.default_route_iface ?? "—")],
              ["4G modem", modemLabel(liveNetwork.modem_detected as boolean | undefined)],
              ["4G connection", liveNetwork.modem_detected === false ? "Not available" : String(liveNetwork.connection_name ?? "—")],
              ["4G state", cellularStateLabel(
                liveNetwork.modem_detected as boolean | undefined,
                String(liveNetwork.connection_state ?? liveNetwork.modem_manager_state ?? "—"),
              )],
              ["GNSS", gnssLabel],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b dash-border pb-2">
                <span className="dash-text-muted uppercase text-xs tracking-wider">{label}</span>
                <span className="dash-text-primary truncate text-right">{value}</span>
              </div>
            ))}
          </div>
          {Array.isArray(liveNetwork.active_interfaces) && (
            <p className="mt-3 text-xs dash-text-muted">
              Interfaces: {(liveNetwork.active_interfaces as string[]).join(", ")}
            </p>
          )}
          {liveNetwork.modem_detected === false && (
            <p className="mt-3 text-xs text-amber-300/90">
              PiTalk/Quectel module not detected — Wi-Fi/Tailscale/backend may still be fine for handover. Run pi_pitalk_4g_bringup.sh on the Pi.
            </p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="CPU & Memory (60s)" action={
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
            <span className="text-[10px] font-mono text-slate-500">LIVE</span>
          </div>
        }>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cpuChart} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="t" stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="cpu" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="CPU" />
                <Line type="monotone" dataKey="mem" stroke="#a78bfa" strokeWidth={1.5} dot={false} name="Memory" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-cyan-500 rounded inline-block"></span> CPU</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-violet-500 rounded inline-block"></span> Memory</span>
          </div>
        </Card>

        <Card title="Battery Voltage & Current (24h)" action={
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
            <span className="text-[10px] font-mono text-slate-500">LIVE</span>
          </div>
        }>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={battChart} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="v" domain={[11.5, 13]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="a" orientation="right" domain={[0, 1]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 11 }} />
                <Line yAxisId="v" type="monotone" dataKey="voltage" stroke="#10b981" strokeWidth={2} dot={false} name="Voltage (V)" />
                <Line yAxisId="a" type="monotone" dataKey="current" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Current (A)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500 rounded inline-block"></span> Voltage</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-500 rounded inline-block"></span> Current</span>
          </div>
        </Card>
      </div>

      {/* Storage breakdown */}
      <Card title="Storage Breakdown">
        <div className="space-y-3">
          {[
            { label: "Hydrophone Audio", used: "38.2 GB", pct: 85, color: "bg-cyan-500" },
            { label: "Telemetry Logs", used: "3.8 GB", pct: 8, color: "bg-blue-500" },
            { label: "Sensor Data", used: "1.9 GB", pct: 4, color: "bg-emerald-500" },
            { label: "System Logs", used: "0.7 GB", pct: 2, color: "bg-slate-500" },
            { label: "Free Space", used: "211.4 GB", pct: 0, color: "" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-4">
              <span className="text-xs text-slate-400 w-36 shrink-0">{item.label}</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                {item.pct > 0 && <div className={clsx("h-full rounded-full", item.color)} style={{ width: `${item.pct}%` }} />}
              </div>
              <span className="text-xs font-mono text-slate-500 w-20 text-right">{item.used}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-xs font-mono text-slate-500">
          <span>Total: 256 GB (SD Card)</span>
          <span>Used: 44.6 GB (17.4%)</span>
        </div>
      </Card>

      {/* Running processes */}
      <Card title="Running Processes" action={<span className="text-[10px] font-mono text-slate-600">{processes.length} services</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2">Process</th>
                <th className="px-4 py-2">CPU</th>
                <th className="px-4 py-2">Memory</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm font-mono">
              {processes.map(p => (
                <tr key={p.name} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-2 text-slate-200">{p.name}</td>
                  <td className="px-4 py-2 text-slate-400">{p.cpu}</td>
                  <td className="px-4 py-2 text-slate-400">{p.mem}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={p.status === "running" ? "success" : p.status === "standby" ? "neutral" : "info"}>
                      {p.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Watchdog & Power */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Watchdog Status" className="!bg-slate-900/60">
          <div className="space-y-3 text-xs">
            {[
              { label: "Hardware Watchdog", value: "Active", status: "success" as const },
              { label: "Last Kick", value: "4s ago", status: "success" as const },
              { label: "Timeout", value: "30s", status: "info" as const },
              { label: "Total Resets", value: "0 (this deployment)", status: "success" as const },
              { label: "Safe Mode Triggers", value: "0", status: "success" as const },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-slate-500 font-mono">{item.label}</span>
                <StatusBadge status={item.status}>{item.value}</StatusBadge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Power Budget Estimate" className="!bg-slate-900/60">
          <div className="space-y-3 text-xs">
            {[
              { label: "RPi 4 Compute", draw: "2.5 W" },
              { label: "Hydrophone + AFE", draw: "0.8 W" },
              { label: "GPS Module", draw: "0.15 W" },
              { label: "LoRa Radio (TX avg)", draw: "0.12 W" },
              { label: "Sensors (BME280, DS18B20)", draw: "0.05 W" },
              { label: "Total Estimated", draw: "~3.6 W" },
            ].map(item => (
              <div key={item.label} className={clsx("flex justify-between items-center", item.label.startsWith("Total") && "pt-2 border-t border-slate-800 font-semibold")}>
                <span className="text-slate-400 font-mono">{item.label}</span>
                <span className={clsx("font-mono", item.label.startsWith("Total") ? "text-cyan-400" : "text-slate-300")}>{item.draw}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
            {isBrightonDemo() ? (
              <span>Replay power budget — illustrative only.</span>
            ) : batterySource === "measured" ? (
              <span>
                Live pack voltage / SOC from serial telemetry when available.
                {liveHealth?.pack_v != null ? ` Pack: ${liveHealth.pack_v} V.` : ""}
                {liveHealth?.soc_pct != null ? ` SOC: ${liveHealth.soc_pct}%.` : ""}
              </span>
            ) : batterySource === "estimated" ? (
              <span className="text-amber-300/90">
                Estimated battery state, not calibrated live measurement. See docs/BATTERY_RUNTIME_AND_POWER_NOTES.md.
              </span>
            ) : (
              <span>No calibrated battery sensor on Pi — do not treat dashboard SOC as measured.</span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}