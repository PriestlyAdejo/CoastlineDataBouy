import { Card } from "../components/Card";
import { MetricCard, StatusBadge } from "../components/Widgets";
import {
  Activity, Radio, Wifi, Signal, Clock, ArrowUpDown,
  RefreshCw, Pin, Eye, Battery,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { PinToOverviewButton } from "../components/OverviewContext";
import { getPageNodeSubtitle, isBrightonDemo } from "../lib/demoMode";
import { useDeploymentView } from "../hooks/useDeploymentView";
import { selectChartSeries } from "../lib/replaySelectors";

const packetData = Array.from({ length: 48 }, (_, i) => ({
  time: `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
  received: 95 + Math.random() * 5,
  latency: 120 + Math.random() * 80,
}));

const rssiData = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  rssi: -85 + Math.random() * 25,
  snr: 8 + Math.random() * 6,
}));

const uptimeLog = [
  { period: "Last 24h", uptime: "99.8%", packets: "2,847", lost: "6" },
  { period: "Last 7d", uptime: "99.2%", packets: "19,824", lost: "158" },
  { period: "Last 30d", uptime: "98.7%", packets: "84,210", lost: "1,095" },
];

export function Telemetry() {
  const vm = useDeploymentView();
  const tel = vm?.telemetry;
  const packetChart = isBrightonDemo()
    ? selectChartSeries(vm, "packet").map((p) => ({ time: p.label, received: p.value, latency: 120 }))
    : packetData;
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Telemetry & Communications</h1>
          <p className="text-slate-500 text-sm mt-1">{getPageNodeSubtitle("Link health, packet delivery, cadence monitoring, and comms status")}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status="success">LoRa Connected</StatusBadge>
          <PinToOverviewButton widget={{ id: "telemetry-packet-rate", source: "Telemetry", label: "Packet Delivery Rate", type: "metric" }} />
        </div>
      </div>

      {isBrightonDemo() && (
        <div className="text-[10px] font-mono text-slate-600">
          Sync: {vm?.sync.label ?? "Replay data"}
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isBrightonDemo() && tel ? (
          <>
            <MetricCard title="Replay Seq" value={String(tel.seq ?? "—")} unit="" trend="neutral" trendValue={`Phase: ${tel.phaseLabel}`} icon={ArrowUpDown} status="success" />
            <MetricCard title="Upload Delivery" value={tel.uploadRate.replace("%", "")} unit="%" trend="neutral" trendValue={`${tel.filesUploaded ?? 0} uploaded`} icon={Activity} status="success" />
            <MetricCard title="Battery SOC" value={tel.socPct.replace("%", "")} unit="%" trend="neutral" trendValue={tel.packV} icon={Battery} status="success" />
            <MetricCard title="Pending Files" value={String(tel.filesPending ?? 0)} unit="" trend="neutral" trendValue="Replay queue" icon={RefreshCw} status="info" />
          </>
        ) : (
          <>
            <MetricCard title="Packet Rate" value="59" unit="/min" trend="neutral" trendValue="Nominal" icon={ArrowUpDown} status="success" />
            <MetricCard title="Packet Loss" value="0.21" unit="%" trend="down" trendValue="-0.03% (24h)" icon={Activity} status="success" />
            <MetricCard title="Avg Latency" value="142" unit="ms" trend="up" trendValue="+8ms" icon={Clock} status="normal" />
            <MetricCard title="Uptime" value="14d 7h" unit="" trend="neutral" trendValue="Since last reset" icon={RefreshCw} status="info" />
          </>
        )}
      </div>

      {/* Comms channels */}
      <Card title="Communication Channels">
        <div className="space-y-3">
          {[
            { name: "LoRa 868MHz", status: "Active" as const, mode: "Primary Telemetry", rssi: "-72 dBm", snr: "11.2 dB", cadence: "Every 30s", packets24h: "2,847" },
            { name: "Wi-Fi (Dockside)", status: "Standby" as const, mode: "Bulk Transfer / Service", rssi: "N/A", snr: "N/A", cadence: "On demand", packets24h: "—" },
            { name: "Iridium SBD", status: "Future" as const, mode: "Satellite Backup", rssi: "N/A", snr: "N/A", cadence: "Configurable", packets24h: "—" },
          ].map(ch => (
            <div key={ch.name} className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-800 hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "h-8 w-8 rounded-lg flex items-center justify-center border",
                  ch.status === "Active" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                  ch.status === "Standby" ? "bg-slate-800 border-slate-700 text-slate-400" :
                  "bg-slate-800/50 border-slate-700/50 text-slate-600"
                )}>
                  {ch.status === "Active" ? <Radio size={16} /> : ch.status === "Standby" ? <Wifi size={16} /> : <Signal size={16} />}
                </div>
                <div>
                  <div className="text-sm text-slate-200 flex items-center gap-2">
                    {ch.name}
                    {ch.status === "Future" && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">FUTURE MODULE</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">{ch.mode}</div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs font-mono">
                <div className="text-right">
                  <div className="text-slate-500">RSSI</div>
                  <div className="text-slate-300">{ch.rssi}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500">SNR</div>
                  <div className="text-slate-300">{ch.snr}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500">CADENCE</div>
                  <div className="text-slate-300">{ch.cadence}</div>
                </div>
                <StatusBadge status={ch.status === "Active" ? "success" : ch.status === "Standby" ? "neutral" : "info"}>
                  {ch.status}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Packet delivery chart */}
        <Card title="Packet Delivery Rate (24h)" action={
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
            <span className="text-[10px] font-mono text-slate-500">LIVE — {liveTime.toLocaleTimeString("en-GB")}</span>
          </div>
        }>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={packetChart} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="packetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[90, 100]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="received" stroke="#06b6d4" strokeWidth={1.5} fill="url(#packetGrad)" name="Delivery %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* RSSI & SNR chart */}
        <Card title="Signal Quality — RSSI & SNR (24h)" action={
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
            <span className="text-[10px] font-mono text-slate-500">LIVE</span>
          </div>
        }>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rssiData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 8, fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="rssi" stroke="#06b6d4" strokeWidth={2} dot={false} name="RSSI (dBm)" />
                <Line yAxisId="right" type="monotone" dataKey="snr" stroke="#3b82f6" strokeWidth={2} dot={false} name="SNR (dB)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-cyan-500 rounded inline-block"></span> RSSI</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-blue-500 rounded inline-block"></span> SNR</span>
          </div>
        </Card>
      </div>

      {/* Uptime table */}
      <Card title="Uptime & Reliability Summary">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Uptime</th>
                <th className="px-4 py-3">Packets Received</th>
                <th className="px-4 py-3">Packets Lost</th>
              </tr>
            </thead>
            <tbody className="text-sm font-mono">
              {uptimeLog.map(row => (
                <tr key={row.period} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-300">{row.period}</td>
                  <td className="px-4 py-3 text-emerald-400">{row.uptime}</td>
                  <td className="px-4 py-3 text-slate-300">{row.packets}</td>
                  <td className="px-4 py-3 text-slate-500">{row.lost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Recent Packet Log" action={<span className="text-[10px] font-mono text-slate-600">Last entries (RSSI / SNR in caption)</span>}>
        <div className="space-y-1 font-mono text-xs">
          {(isBrightonDemo() && vm?.telemetry.recentPackets.length
            ? vm.telemetry.recentPackets.map((p, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-1.5 rounded hover:bg-slate-800/30 transition-colors">
                <span className="text-slate-600 w-28">{p.time}</span>
                <span className="w-16 text-center px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400">GPS</span>
                <span className="text-slate-400 flex-1 truncate">
                  lat={p.lat} lon={p.lon} fix=3D rssi={p.rssi}dBm snr={p.snr}dB status={p.status}
                </span>
              </div>
            ))
            : Array.from({ length: 10 }).map((_, i) => {
              const t = new Date(Date.now() - i * 30000);
              const types = ["TELEM", "HEALTH", "GPS", "ENV", "TELEM", "ALERT", "TELEM", "HEALTH", "TELEM", "GPS"];
              const type = types[i];
              return (
                <div key={i} className="flex items-center gap-4 px-3 py-1.5 rounded hover:bg-slate-800/30 transition-colors">
                  <span className="text-slate-600 w-20">{t.toLocaleTimeString("en-GB")}</span>
                  <span className={clsx(
                    "w-16 text-center px-1.5 py-0.5 rounded text-[10px]",
                    type === "ALERT" ? "bg-amber-500/10 text-amber-400" :
                    type === "GPS" ? "bg-blue-500/10 text-blue-400" :
                    type === "ENV" ? "bg-emerald-500/10 text-emerald-400" :
                    "bg-slate-800 text-slate-400"
                  )}>{type}</span>
                  <span className="text-slate-400 flex-1 truncate">
                    {type === "TELEM" ? `rssi=-${70 + Math.floor(Math.random() * 15)}dBm snr=${(8 + Math.random() * 5).toFixed(1)}dB` :
                     type === "GPS" ? `lat=55.65 lon=-5.15 fix=3D sats=8` :
                     type === "ENV" ? `water_t=14.3°C` :
                     type === "HEALTH" ? `cpu=32% mem=48% wdog=OK` :
                     `threshold_breach: noise_floor > 70dB`}
                  </span>
                </div>
              );
            }))}
        </div>
      </Card>
    </div>
  );
}