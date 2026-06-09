import { Card } from "../components/Card";
import { MetricCard, StatusBadge } from "../components/Widgets";
import {
  Thermometer, Droplets, Wind, Sun, Eye, Waves, Gauge,
  Pin, AlertTriangle, CheckCircle2, CircleDashed, Clock,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { clsx } from "clsx";
import { useState, useEffect } from "react";
import { PinToOverviewButton } from "../components/OverviewContext";
import { lastUpdateLabel } from "../lib/deploymentDisplay";
import { getPageNodeSubtitle, isBrightonDemo } from "../lib/demoMode";
import { useDeploymentView } from "../hooks/useDeploymentView";
import { selectChartSeries } from "../lib/replaySelectors";
import { useLiveNode } from "../components/LiveNodeProvider";
import { isNoLiveEnv, liveWaterTempC } from "../lib/liveSensorStatus";
import { cartesianGridProps, xAxisProps, yAxisProps, chartTooltipStyle } from "../lib/chartTheme";

const waterTempData = Array.from({ length: 48 }, (_, i) => ({
  time: `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
  temp: 13.8 + Math.sin(i / 8) * 0.6 + Math.random() * 0.2,
}));

const pressureData = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  pressure: 1013 + Math.sin(i / 6) * 4 + Math.random() * 2,
}));

type SensorStatus = "active" | "installed" | "optional" | "future";

interface SensorModule {
  name: string;
  status: SensorStatus;
  value?: string;
  unit?: string;
  description: string;
  icon: any;
  lastUpdate?: string;
}

const sensorModules: SensorModule[] = [
  { name: "Water Temperature", status: "active", value: "14.3", unit: "°C", description: "DS18B20 — 1-Wire, ±0.5°C accuracy", icon: Thermometer, lastUpdate: "12s ago" },
  { name: "Enclosure Temperature", status: "active", value: "22.4", unit: "°C", description: "BME280 — Internal monitoring", icon: Thermometer, lastUpdate: "12s ago" },
  { name: "Internal Humidity", status: "active", value: "38", unit: "%RH", description: "BME280 — Condensation watchdog", icon: Droplets, lastUpdate: "12s ago" },
  { name: "Barometric Pressure", status: "installed", value: "1013.2", unit: "hPa", description: "BME280 — Surface pressure reference", icon: Gauge, lastUpdate: "12s ago" },
  { name: "Pressure / Depth", status: "optional", value: "—", unit: "", description: "MS5837-30BA — Submersion depth estimate", icon: Waves },
  { name: "Air Temperature", status: "optional", value: "—", unit: "", description: "External air probe — deployment-dependent", icon: Wind },
  { name: "Solar Irradiance", status: "future", value: "—", unit: "", description: "Photodiode / pyranometer — energy budget estimate", icon: Sun },
  { name: "Turbidity", status: "future", value: "—", unit: "", description: "Optical turbidity sensor — water clarity index", icon: Eye },
  { name: "Conductivity", status: "future", value: "—", unit: "", description: "EC probe — salinity estimation", icon: Droplets },
  { name: "Dissolved Oxygen", status: "future", value: "—", unit: "", description: "Optical DO sensor — water quality module", icon: Droplets },
];

const statusConfig: Record<SensorStatus, { label: string; badge: "success" | "info" | "neutral" | "warning"; icon: any }> = {
  active: { label: "Active", badge: "success", icon: CheckCircle2 },
  installed: { label: "Installed", badge: "info", icon: CheckCircle2 },
  optional: { label: "Optional", badge: "neutral", icon: CircleDashed },
  future: { label: "Future Module", badge: "warning", icon: Clock },
};

export function Environment() {
  const vm = useDeploymentView();
  const live = useLiveNode();
  const env = vm?.environment;
  const noLiveEnv = !isBrightonDemo() && isNoLiveEnv(live?.env);
  const liveWater = !isBrightonDemo() ? liveWaterTempC(live?.env) : null;
  const waterChart = isBrightonDemo()
    ? selectChartSeries(vm, "water").map((p) => ({ time: p.label, temp: p.value }))
    : noLiveEnv
      ? []
      : waterTempData;
  const pressChart = isBrightonDemo()
    ? selectChartSeries(vm, "pressure").map((p) => ({ time: p.label, pressure: p.value }))
    : noLiveEnv
      ? []
      : pressureData;
  const [filter, setFilter] = useState<SensorStatus | "all">("all");
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const modules = isBrightonDemo() && env
    ? sensorModules.map((s) =>
        s.name === "Water Temperature"
          ? { ...s, value: env.waterTempC, lastUpdate: lastUpdateLabel() }
          : s.name === "Enclosure Temperature"
            ? { ...s, value: env.enclosureTempC, lastUpdate: lastUpdateLabel() }
            : s.name === "Internal Humidity"
              ? { ...s, value: env.enclosureRhPct, lastUpdate: lastUpdateLabel() }
              : s.name === "Barometric Pressure"
                ? { ...s, value: env.pressureHpa, lastUpdate: lastUpdateLabel() }
                : s,
      )
    : noLiveEnv
      ? sensorModules.map((s) => ({
          ...s,
          status: "optional" as SensorStatus,
          value: "—",
          lastUpdate: undefined,
        }))
      : liveWater != null
        ? sensorModules.map((s) =>
            s.name === "Water Temperature"
              ? { ...s, value: String(liveWater), lastUpdate: live?.lastUpdateIso ?? undefined }
              : s,
          )
        : sensorModules;
  const filtered = filter === "all" ? modules : modules.filter(s => s.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold dash-text-primary tracking-tight">Environmental Sensing</h1>
          <p className="text-slate-500 text-sm mt-1">{getPageNodeSubtitle("Active, installed, and available sensor modules")}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={noLiveEnv ? "warning" : "success"}>
            {noLiveEnv ? "No live environment sensor data yet" : "Live sensor data"}
          </StatusBadge>
          <PinToOverviewButton widget={{ id: "env-water-temp", source: "Environment", label: "Water Temperature (24h)", type: "chart" }} />
        </div>
      </div>

      {noLiveEnv && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          No live environment sensor data yet. Old replay/demo water temperature values are hidden in LIVE API mode.
        </div>
      )}

      {/* Active metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Water Temp"
          value={noLiveEnv ? "—" : (isBrightonDemo() ? (env?.waterTempC ?? "—") : (liveWater != null ? String(liveWater) : "—"))}
          unit="°C"
          trend="neutral"
          trendValue={noLiveEnv ? "Not available" : "Live"}
          icon={Thermometer}
          status={noLiveEnv ? "warning" : "normal"}
        />
        <MetricCard title="Internal Temp" value={noLiveEnv ? "—" : "—"} unit="°C" trend="neutral" trendValue={noLiveEnv ? "No live sensor" : "Not connected"} icon={Thermometer} status={noLiveEnv ? "warning" : "normal"} />
        <MetricCard title="Humidity" value={noLiveEnv ? "—" : "—"} unit="%RH" trend="neutral" trendValue={noLiveEnv ? "No live sensor" : "Not connected"} icon={Droplets} status={noLiveEnv ? "warning" : "normal"} />
        <MetricCard title="Pressure" value={noLiveEnv ? "—" : "—"} unit="hPa" trend="neutral" trendValue={noLiveEnv ? "No live sensor" : "Not connected"} icon={Gauge} status={noLiveEnv ? "warning" : "normal"} />
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Water Temperature (24h)" action={
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
            <span className="text-[10px] font-mono text-slate-500">LIVE</span>
          </div>
        }>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waterChart} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...cartesianGridProps()} />
                <XAxis dataKey="time" {...xAxisProps()} />
                <YAxis domain={[13, 15]} {...yAxisProps({ unit: "°C" })} />
                <Tooltip {...chartTooltipStyle()} />
                <Area type="monotone" dataKey="temp" stroke="#06b6d4" strokeWidth={1.5} fill="url(#tempGrad)" name="Water Temp" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-mono text-slate-600">
            <span>Threshold: 10–20°C nominal</span>
            <span>Min: 13.6°C | Max: 14.8°C</span>
          </div>
        </Card>

        <Card title="Barometric Pressure (24h)" action={
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
            <span className="text-[10px] font-mono text-slate-500">LIVE</span>
          </div>
        }>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pressChart} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid {...cartesianGridProps()} />
                <XAxis dataKey="time" {...xAxisProps()} />
                <YAxis domain={[1005, 1020]} {...yAxisProps()} />
                <Tooltip {...chartTooltipStyle()} />
                <Line type="monotone" dataKey="pressure" stroke="#a78bfa" strokeWidth={2} dot={false} name="hPa" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Sensor module filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-slate-500 mr-2">Filter:</span>
        {(["all", "active", "installed", "optional", "future"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              filter === f
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                : "text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
            )}
          >
            {f === "all" ? "All Modules" : statusConfig[f].label}
            {f !== "all" && (
              <span className="ml-1.5 text-[10px] text-slate-500">
                ({sensorModules.filter(s => s.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sensor modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(sensor => {
          const cfg = statusConfig[sensor.status];
          return (
            <div
              key={sensor.name}
              className={clsx(
                "rounded-lg border p-4 transition-colors",
                sensor.status === "active" ? "border-slate-800 bg-slate-900/40 hover:bg-slate-800/30" :
                sensor.status === "installed" ? "border-slate-800 bg-slate-900/30 hover:bg-slate-800/20" :
                sensor.status === "optional" ? "border-slate-800/60 bg-slate-900/20" :
                "border-dashed dash-border"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "h-9 w-9 rounded-lg flex items-center justify-center border",
                    sensor.status === "active" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                    sensor.status === "installed" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                    "bg-slate-800 border-slate-700 text-slate-500"
                  )}>
                    <sensor.icon size={18} />
                  </div>
                  <div>
                    <div className="text-sm text-slate-200">{sensor.name}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">{sensor.description}</div>
                  </div>
                </div>
                <StatusBadge status={cfg.badge}>{cfg.label}</StatusBadge>
              </div>
              {sensor.value && sensor.value !== "—" && (
                <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-mono text-slate-100">{sensor.value}</span>
                    {sensor.unit && <span className="text-sm font-mono text-slate-500">{sensor.unit}</span>}
                  </div>
                  {sensor.lastUpdate && (
                    <span className="text-[10px] font-mono text-slate-600">Updated {sensor.lastUpdate}</span>
                  )}
                </div>
              )}
              {sensor.status === "future" && (
                <div className="mt-3 pt-3 border-t border-slate-800/30">
                  <span className="text-[10px] font-mono text-slate-600">Not installed on current buoy — available as expansion module</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}