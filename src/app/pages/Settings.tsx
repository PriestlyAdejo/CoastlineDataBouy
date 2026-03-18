import { Card } from "../components/Card";
import { StatusBadge } from "../components/Widgets";
import {
  Settings as SettingsIcon, Monitor, Bell, MapPin, Clock,
  Thermometer, HardDrive, Palette, Code, Shield, Save, RotateCcw,
  Layers, Eye, Radio,
} from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

type SettingsTab = "dashboard" | "alerts" | "display" | "data" | "sensors" | "advanced";

const tabs: { id: SettingsTab; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: Monitor },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "display", label: "Display", icon: Palette },
  { id: "data", label: "Data & Sync", icon: HardDrive },
  { id: "sensors", label: "Sensors", icon: Thermometer },
  { id: "advanced", label: "Advanced", icon: Code },
];

function Toggle({ enabled, onChange, label, description }: { enabled: boolean; onChange: () => void; label: string; description?: string }) {
  return (
    <label className="flex items-center justify-between py-3 cursor-pointer group">
      <div>
        <div className="text-sm text-slate-200 group-hover:text-slate-100 transition-colors">{label}</div>
        {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
      </div>
      <button
        onClick={onChange}
        className={clsx("w-9 h-5 rounded-full transition-colors relative shrink-0 ml-4", enabled ? "bg-cyan-500" : "bg-slate-700")}
      >
        <div className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform", enabled ? "translate-x-4.5" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

function SelectControl({ label, options, value, onChange, description }: { label: string; options: string[]; value: string; onChange: (v: string) => void; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm text-slate-200">{label}</div>
        {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("dashboard");
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: "30s",
    showLiveIndicators: true,
    compactMode: false,
    theme: "Dark",
    units: "Metric",
    timeFormat: "24h",
    timezone: "UTC",
    mapStyle: "Dark",
    showNodeLabels: true,
    showDriftTrail: false,
    alertSound: false,
    alertBrowserNotif: true,
    alertEmailDigest: false,
    digestFrequency: "Daily",
    autoSync: true,
    syncMode: "LoRa Summary",
    retentionDays: "90 days",
    autoRotateLogs: true,
    showInactiveSensors: true,
    sensorPollingRate: "30s",
    debugMode: false,
    showAPIEndpoints: false,
    verboseLogging: false,
  });

  const toggle = (key: keyof typeof settings) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Dashboard preferences, alert configuration, and system settings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 transition-colors text-xs font-medium">
            <RotateCcw size={14} /> Reset to Defaults
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors text-xs font-medium">
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab navigation */}
        <div className="space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left",
                activeTab === tab.id
                  ? "bg-slate-800 text-cyan-400"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings content */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === "dashboard" && (
            <Card title="Dashboard Preferences">
              <div className="divide-y divide-slate-800">
                <Toggle enabled={settings.autoRefresh as boolean} onChange={() => toggle("autoRefresh")} label="Auto-Refresh Data" description="Automatically poll for new telemetry data at the configured interval." />
                <SelectControl label="Refresh Interval" options={["10s", "30s", "60s", "5m"]} value={settings.refreshInterval} onChange={v => setSettings(p => ({ ...p, refreshInterval: v }))} description="How often to request updated data from the buoy." />
                <Toggle enabled={settings.showLiveIndicators as boolean} onChange={() => toggle("showLiveIndicators")} label="Show Live Indicators" description="Display pulsing dots and timestamps on live-updating charts." />
                <Toggle enabled={settings.compactMode as boolean} onChange={() => toggle("compactMode")} label="Compact Mode" description="Reduce padding and card sizes for higher data density." />
              </div>
            </Card>
          )}

          {activeTab === "alerts" && (
            <>
              <Card title="Alert Notifications">
                <div className="divide-y divide-slate-800">
                  <Toggle enabled={settings.alertSound as boolean} onChange={() => toggle("alertSound")} label="Alert Sounds" description="Play an audible notification for critical and warning alerts." />
                  <Toggle enabled={settings.alertBrowserNotif as boolean} onChange={() => toggle("alertBrowserNotif")} label="Browser Notifications" description="Send browser push notifications for new alerts." />
                  <Toggle enabled={settings.alertEmailDigest as boolean} onChange={() => toggle("alertEmailDigest")} label="Email Digest" description="Receive a summary email of alerts at the configured frequency." />
                  <SelectControl label="Digest Frequency" options={["Hourly", "Daily", "Weekly"]} value={settings.digestFrequency} onChange={v => setSettings(p => ({ ...p, digestFrequency: v }))} />
                </div>
              </Card>
              <Card title="Alert Thresholds" action={<span className="text-[10px] font-mono text-slate-600">See Alerts page for full threshold table</span>}>
                <p className="text-xs text-slate-500">Configure warning and critical thresholds for battery voltage, temperature, humidity, RSSI, storage, and packet loss on the <span className="text-cyan-400">Alerts</span> page.</p>
              </Card>
            </>
          )}

          {activeTab === "display" && (
            <>
              <Card title="Visual Preferences">
                <div className="divide-y divide-slate-800">
                  <SelectControl label="Theme" options={["Dark", "Light (Future)"]} value={settings.theme} onChange={v => setSettings(p => ({ ...p, theme: v }))} description="Dashboard colour theme. Light mode planned for poster/report use." />
                  <SelectControl label="Units" options={["Metric", "Imperial"]} value={settings.units} onChange={v => setSettings(p => ({ ...p, units: v }))} />
                  <SelectControl label="Time Format" options={["24h", "12h (AM/PM)"]} value={settings.timeFormat} onChange={v => setSettings(p => ({ ...p, timeFormat: v }))} />
                  <SelectControl label="Timezone" options={["UTC", "Local (Browser)", "GMT", "BST"]} value={settings.timezone} onChange={v => setSettings(p => ({ ...p, timezone: v }))} />
                </div>
              </Card>
              <Card title="Map Display">
                <div className="divide-y divide-slate-800">
                  <SelectControl label="Default Map Style" options={["Dark", "Satellite", "Terrain"]} value={settings.mapStyle} onChange={v => setSettings(p => ({ ...p, mapStyle: v }))} />
                  <Toggle enabled={settings.showNodeLabels as boolean} onChange={() => toggle("showNodeLabels")} label="Show Node Labels" description="Display node ID labels on map markers." />
                  <Toggle enabled={settings.showDriftTrail as boolean} onChange={() => toggle("showDriftTrail")} label="Show Drift Trail" description="Display GPS position history trail on the map." />
                </div>
              </Card>
            </>
          )}

          {activeTab === "data" && (
            <Card title="Data & Synchronisation">
              <div className="divide-y divide-slate-800">
                <Toggle enabled={settings.autoSync as boolean} onChange={() => toggle("autoSync")} label="Auto-Sync" description="Automatically synchronise new data files when buoy is within Wi-Fi range." />
                <SelectControl label="Primary Comms Mode" options={["LoRa Summary", "Wi-Fi (Full)", "Manual Only"]} value={settings.syncMode} onChange={v => setSettings(p => ({ ...p, syncMode: v }))} description="Default communication mode for dashboard data." />
                <SelectControl label="Data Retention" options={["30 days", "60 days", "90 days", "180 days", "1 year", "Unlimited"]} value={settings.retentionDays} onChange={v => setSettings(p => ({ ...p, retentionDays: v }))} description="How long to keep local dashboard copies of historical data." />
                <Toggle enabled={settings.autoRotateLogs as boolean} onChange={() => toggle("autoRotateLogs")} label="Auto-Rotate Logs" description="Automatically compress and archive old system log files." />
              </div>
            </Card>
          )}

          {activeTab === "sensors" && (
            <Card title="Sensor Visibility & Polling">
              <div className="divide-y divide-slate-800">
                <Toggle enabled={settings.showInactiveSensors as boolean} onChange={() => toggle("showInactiveSensors")} label="Show Inactive / Future Sensors" description="Display optional and future sensor modules on the Environment page." />
                <SelectControl label="Sensor Polling Rate" options={["10s", "30s", "60s", "5m"]} value={settings.sensorPollingRate} onChange={v => setSettings(p => ({ ...p, sensorPollingRate: v }))} description="How frequently the buoy samples environmental sensors." />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Installed Module Status</h4>
                <div className="space-y-2 text-xs">
                  {[
                    { name: "Hydrophone (H1-Omni)", status: "Active" },
                    { name: "DS18B20 Water Temp", status: "Active" },
                    { name: "BME280 (Enclosure)", status: "Active" },
                    { name: "GPS / GNSS", status: "Active" },
                    { name: "IMU (MPU6050)", status: "Active" },
                    { name: "Pressure / Depth", status: "Not Installed" },
                    { name: "Turbidity Sensor", status: "Not Installed" },
                  ].map(m => (
                    <div key={m.name} className="flex justify-between items-center">
                      <span className="text-slate-400 font-mono">{m.name}</span>
                      <StatusBadge status={m.status === "Active" ? "success" : "neutral"}>{m.status}</StatusBadge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {activeTab === "advanced" && (
            <Card title="Advanced / Developer">
              <div className="divide-y divide-slate-800">
                <Toggle enabled={settings.debugMode as boolean} onChange={() => toggle("debugMode")} label="Debug Mode" description="Show additional diagnostic information in the UI." />
                <Toggle enabled={settings.showAPIEndpoints as boolean} onChange={() => toggle("showAPIEndpoints")} label="Show API Endpoints" description="Display REST API endpoint URLs on data pages." />
                <Toggle enabled={settings.verboseLogging as boolean} onChange={() => toggle("verboseLogging")} label="Verbose Logging" description="Enable detailed client-side logging to browser console." />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">System Information</h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between"><span className="text-slate-500">Dashboard Version</span><span className="text-slate-300">v0.4.0-alpha</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">API Endpoint</span><span className="text-slate-300">https://api.nereus.local/v1</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Firmware</span><span className="text-slate-300">v1.2.3-rc1</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Build</span><span className="text-slate-300">2026.03.17.1432</span></div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
