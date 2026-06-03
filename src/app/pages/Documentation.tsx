import { BookOpen, ExternalLink } from "lucide-react";
import { createApiClient } from "../api/client";

const DOC_LINKS = [
  { title: "Friday Handover Checklist", path: "docs/FRIDAY_HANDOVER_CHECKLIST.md" },
  { title: "Pi HDMI / Tailscale Recovery", path: "docs/PI_HDMI_RECOVERY_AND_TAILSCALE.md" },
  { title: "Local Tailscale Handover", path: "docs/HANDOVER_LOCAL_TAILSCALE.md" },
  { title: "GPS Heartbeat & Location", path: "docs/DASHBOARD_LIVE_MODE.md" },
  { title: "Hydrophone Data Retrieval", path: "docs/DOWNLOADS_AND_EXPORTS.md" },
  { title: "Battery & Runtime Notes", path: "docs/BATTERY_RUNTIME_AND_POWER_NOTES.md" },
  { title: "SIM / 4G Connectivity", path: "docs/SIM_4G_AND_CONNECTIVITY_NOTES.md" },
  { title: "Future Student Extension Guide", path: "docs/FUTURE_STUDENT_EXTENSION_GUIDE.md" },
  { title: "Known Limitations", path: "docs/FRIDAY_HANDOVER_CHECKLIST.md#known-limitations" },
];

export function Documentation() {
  const apiBase = createApiClient().baseUrl;
  const apiRoot = apiBase.replace(/\/v1$/, "");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Docs / API Docs</h1>
        <p className="text-slate-400 text-sm mt-1">
          Friday handover: laptop backend + dashboard, Pi over Tailscale, local SSD audio. Cloud hosting is a future presentation stage, not required for Friday.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5">
        <h2 className="text-base font-semibold text-cyan-400 mb-3">Friday Handover Quick Start</h2>
        <div className="text-sm text-slate-200 space-y-2 font-mono">
          <p><strong>Laptop:</strong></p>
          <div>docker compose -f docker\compose.backend.yml up -d</div>
          <div>scripts\run_handover_backend_tailscale_windows.bat</div>
          <div>scripts\run_handover_frontend_windows.bat</div>
          <div>curl {apiBase}/healthz</div>
          <p className="pt-2"><strong>Pi (SSH/HDMI):</strong></p>
          <div>edge/pi/scripts/apply_handover_env.sh</div>
          <div>edge/pi/scripts/pi_handover_acceptance.sh</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5">
        <h2 className="text-base font-semibold text-cyan-400 mb-3">Repository guides</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {DOC_LINKS.map((d) => (
            <li key={d.path}>
              <a className="text-cyan-400 hover:underline" href={`/${d.path}`} target="_blank" rel="noreferrer">
                {d.title}
              </a>
              <span className="text-slate-500 ml-2 font-mono text-xs">{d.path}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { label: "FastAPI Swagger", href: `${apiRoot}/docs` },
          { label: "Health", href: `${apiBase}/healthz` },
          { label: "Latest snapshot", href: `${apiBase}/nodes/ucl-buoy/snapshots/latest` },
          { label: "Files", href: `${apiBase}/files` },
          { label: "Latest export", href: `${apiBase}/exports/latest_snapshot.json` },
        ].map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-700 bg-slate-900/30 hover:bg-slate-800/30 px-3 py-2 text-sm text-slate-200 flex items-center justify-between"
          >
            <span>{link.label}</span>
            <ExternalLink size={14} className="text-slate-500" />
          </a>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5 text-sm text-slate-200 space-y-3">
        <div className="font-semibold text-cyan-400">Modes</div>
        <div><BookOpen size={14} className="inline mr-2" />LIVE API — real Pi data; never Brighton coordinates unless replay enabled.</div>
        <div><BookOpen size={14} className="inline mr-2" />BRIGHTON REPLAY — deterministic demo only (localStorage demo mode).</div>
        <div className="font-semibold text-cyan-400">GPS Heartbeat</div>
        <div>Map shows Live GNSS fix, Approximate IP fallback, or No live GNSS fix yet. Location object on latest snapshot.</div>
        <div className="font-semibold text-cyan-400">Hydrophone</div>
        <div>Raw WAV on Pi SSD at /mnt/ssd/buoy/raw/audio. Metadata uploads; binary may show file_on_pi_not_synced on Files page.</div>
        <div className="font-semibold text-cyan-400">Known limitations</div>
        <div>4G after reboot must be proven; battery/SPL uncalibrated unless instrumented; no live audio stream; cloud deployment future.</div>
      </div>
    </div>
  );
}
