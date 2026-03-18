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
  const [filter, setFilter] = useState<SensorStatus | "all">("all");
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const filtered = filter === "all" ? sensorModules : sensorModules.filter(s => s.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Environmental Sensing</h1>
          <p className="text-slate-500 text-sm mt-1">Active, installed, and available sensor modules for BY-04-A.</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status="success">4 Active Sensors</StatusBadge>
          <PinToOverviewButton widget={{ id: "env-water-temp", source: "Environment", label: "Water Temperature (24h)", type: "chart" }} />
        </div>
      </div>

      {/* Active metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Water Temp" value="14.3" unit="°C" trend="up" trendValue="+0.2°C (1h)" icon={Thermometer} status="normal" />
        <MetricCard title="Internal Temp" value="22.4" unit="°C" trend="neutral" trendValue="Nominal" icon={Thermometer} status="success" />
        <MetricCard title="Humidity" value="38" unit="%RH" trend="down" trendValue="-2% (1h)" icon={Droplets} status="success" />
        <MetricCard title="Pressure" value="1013.2" unit="hPa" trend="neutral" trendValue="Stable" icon={Gauge} status="normal" />
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
              <AreaChart data={waterTempData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[13, 15]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} unit="°C" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 11 }} />
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
              <LineChart data={pressureData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[1005, 1020]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 11 }} />
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
                "border-dashed border-slate-800/40 bg-slate-900/10 opacity-70"
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