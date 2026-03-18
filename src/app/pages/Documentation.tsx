import { Card } from "../components/Card";
import {
  BookOpen, ChevronRight, Cpu, Waves, MapPin, HardDrive,
  Radio, Shield, Wrench, Code, FileText, Compass, Search,
} from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

interface DocSection {
  id: string;
  title: string;
  icon: any;
  description: string;
  articles: { title: string; summary: string }[];
}

const sections: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    description: "Introduction to Project Nereus and how to use this dashboard.",
    articles: [
      { title: "What is Project Nereus?", summary: "Overview of the coastal multi-sensor buoy platform, its mission, and design goals." },
      { title: "Dashboard Quick Tour", summary: "Navigate the main interface sections: Overview, Telemetry, Hydrophone, Environment, and more." },
      { title: "Understanding Live vs. Historical Data", summary: "How summary-driven telemetry differs from raw data access and file downloads." },
      { title: "Node Selection & Multi-Buoy Support", summary: "Selecting active nodes, understanding node states, and future multi-buoy operation." },
    ],
  },
  {
    id: "sensors",
    title: "Sensor Guide",
    icon: Waves,
    description: "Technical details on all installed, optional, and future sensor modules.",
    articles: [
      { title: "Hydrophone System", summary: "Primary acoustic sensor: hardware, sampling rates, file formats, and onboard analysis capabilities." },
      { title: "Environmental Sensors", summary: "DS18B20 water temperature, BME280 enclosure monitoring, and expansion module architecture." },
      { title: "GPS / GNSS Module", summary: "Position tracking, fix quality (HDOP), drift monitoring, and track export formats." },
      { title: "IMU / Motion Sensing", summary: "Accelerometer, gyroscope, and tilt monitoring for deployment stability assessment." },
      { title: "Active vs. Future Modules", summary: "How sensor status labels (Active, Installed, Optional, Future) map to hardware configuration." },
    ],
  },
  {
    id: "architecture",
    title: "System Architecture",
    icon: Cpu,
    description: "Embedded hardware, software stack, and data flow architecture.",
    articles: [
      { title: "Hardware Overview", summary: "Raspberry Pi 4 compute, analog front-end, power regulation, and enclosure design." },
      { title: "Software Stack", summary: "Linux-based stack: capture services, telemetry daemon, watchdog, and data management." },
      { title: "Data Flow Pipeline", summary: "From sensor sampling through local storage to cloud-indexed access and dashboard display." },
      { title: "Power Budget & Management", summary: "Battery monitoring, consumption estimates, sleep modes, and runtime calculations." },
    ],
  },
  {
    id: "comms",
    title: "Communications",
    icon: Radio,
    description: "LoRa telemetry, Wi-Fi servicing, and future satellite connectivity.",
    articles: [
      { title: "LoRa Telemetry Protocol", summary: "Packet structure, transmission cadence, error handling, and range characteristics." },
      { title: "Wi-Fi Service Mode", summary: "Dockside data offload, firmware updates, and direct dashboard access over local network." },
      { title: "Satellite Backup (Future)", summary: "Planned Iridium SBD integration for remote deployments beyond LoRa range." },
    ],
  },
  {
    id: "deployment",
    title: "Deployment Notes",
    icon: Compass,
    description: "Field procedures, site assessment, and mooring guidance.",
    articles: [
      { title: "Pre-Deployment Checklist", summary: "Step-by-step preparation: charge, seal, test, assess conditions, deploy." },
      { title: "Site Selection Criteria", summary: "Depth, seabed type, traffic, environmental exposure, and LoRa line-of-sight considerations." },
      { title: "Mooring & Recovery", summary: "Mooring hardware, deployment procedures, and safe retrieval protocol." },
    ],
  },
  {
    id: "maintenance",
    title: "Maintenance & Calibration",
    icon: Wrench,
    description: "Routine servicing, sensor calibration, and troubleshooting.",
    articles: [
      { title: "Routine Maintenance Schedule", summary: "30-day cycle: battery swap, sensor check, enclosure inspection, data offload." },
      { title: "Sensor Calibration Procedures", summary: "Environmental sensor verification, hydrophone sensitivity checks, GPS accuracy validation." },
      { title: "Troubleshooting Common Issues", summary: "Loss of telemetry, GPS fix failures, storage warnings, and watchdog resets." },
    ],
  },
  {
    id: "data-definitions",
    title: "Data Definitions",
    icon: FileText,
    description: "File formats, data schemas, units, and export specifications.",
    articles: [
      { title: "Telemetry Packet Schema", summary: "Field definitions for LoRa telemetry packets: timestamps, sensor values, health flags." },
      { title: "Audio File Formats", summary: "WAV file specifications: 48kHz, 24-bit, mono. File naming convention and chunking strategy." },
      { title: "Environmental Data Schema", summary: "JSON structure for environmental sensor logs: timestamps, values, units, quality flags." },
      { title: "GPS Track Format", summary: "GPX export format, coordinate reference system, and fix quality metadata." },
    ],
  },
  {
    id: "api",
    title: "API & Integrations",
    icon: Code,
    description: "REST API endpoints, webhook configuration, and third-party integrations.",
    articles: [
      { title: "REST API Overview", summary: "Endpoint structure for accessing telemetry summaries, file indices, and alert history." },
      { title: "Webhook Notifications", summary: "Configurable webhook for alert forwarding to Slack, email, or custom endpoints." },
      { title: "Data Export Formats", summary: "CSV, JSON, and GPX export options for programmatic access to historical data." },
    ],
  },
];

export function Documentation() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredSections = sections.filter(s =>
    !search ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.articles.some(a => a.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Documentation</h1>
          <p className="text-slate-500 text-sm mt-1">System guides, sensor references, deployment notes, and data definitions.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documentation..."
          className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
        />
      </div>

      {/* Section grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSections.map(section => (
          <div key={section.id}>
            <button
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              className={clsx(
                "w-full text-left rounded-xl border p-5 transition-all",
                activeSection === section.id
                  ? "border-cyan-500/30 bg-cyan-950/10"
                  : "border-slate-800 bg-slate-900/40 hover:bg-slate-800/30 hover:border-slate-700"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={clsx(
                  "h-9 w-9 rounded-lg flex items-center justify-center border shrink-0",
                  activeSection === section.id ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-slate-800 border-slate-700 text-slate-400"
                )}>
                  <section.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={clsx("text-sm font-medium", activeSection === section.id ? "text-cyan-400" : "text-slate-200")}>
                      {section.title}
                    </h3>
                    <ChevronRight size={14} className={clsx(
                      "transition-transform text-slate-500",
                      activeSection === section.id && "rotate-90"
                    )} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{section.description}</p>
                  <span className="text-[10px] font-mono text-slate-600 mt-2 inline-block">{section.articles.length} articles</span>
                </div>
              </div>
            </button>

            {/* Expanded articles */}
            {activeSection === section.id && (
              <div className="mt-2 ml-6 space-y-1">
                {section.articles.map(article => (
                  <div
                    key={article.title}
                    className="flex items-start gap-3 px-4 py-3 rounded-lg border border-slate-800/50 hover:bg-slate-800/20 hover:border-slate-700 transition-colors cursor-pointer"
                  >
                    <FileText size={14} className="text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm text-slate-200 hover:text-cyan-400 transition-colors">{article.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{article.summary}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
