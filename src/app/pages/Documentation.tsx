import {
  BookOpen, ExternalLink,
} from "lucide-react";
import { createApiClient } from "../api/client";

export function Documentation() {
  const apiBase = createApiClient().baseUrl;
  const apiRoot = apiBase.replace(/\/v1$/, "");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Docs / API Docs</h1>
        <p className="text-slate-500 text-sm mt-1">Handover quick start, live mode, endpoint reference, and troubleshooting.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-sm font-semibold text-cyan-400 mb-3">Handover Quick Start</h2>
        <div className="text-xs font-mono text-slate-300 space-y-1">
          <div>1) Run `scripts\\run_handover_backend_tailscale_windows.bat`</div>
          <div>2) Run `scripts\\run_handover_frontend_windows.bat`</div>
          <div>3) Set Pi `BUOY_BACKEND_API_BASE=http://&lt;laptop-tailscale-host-or-ip&gt;:8000/v1`</div>
          <div>4) Verify `/v1/healthz` and `/v1/nodes/ucl-buoy/snapshots/latest`</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { label: "FastAPI Swagger", href: `${apiRoot}/docs` },
          { label: "Health", href: `${apiBase}/healthz` },
          { label: "Latest snapshot", href: `${apiBase}/nodes/ucl-buoy/snapshots/latest` },
          { label: "Files", href: `${apiBase}/files` },
          { label: "Latest export", href: `${apiBase}/exports/latest_snapshot.json` },
        ].map((link) => (
          <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-800/30 px-3 py-2 text-sm text-slate-200 flex items-center justify-between">
            <span>{link.label}</span>
            <ExternalLink size={14} className="text-slate-500" />
          </a>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-300 space-y-2">
        <div className="font-semibold text-cyan-400">Modes</div>
        <div><BookOpen size={14} className="inline mr-2" />LIVE API: real Pi data from backend snapshot.</div>
        <div><BookOpen size={14} className="inline mr-2" />BRIGHTON REPLAY: deterministic replay/testing fallback.</div>
        <div><BookOpen size={14} className="inline mr-2" />MOCK FALLBACK/API OFFLINE/STALE LIVE DATA labels identify data quality.</div>
        <div className="font-semibold text-cyan-400 mt-3">Troubleshooting</div>
        <div>- If Pi cannot upload, check Windows Firewall private/Tailscale permissions.</div>
        <div>- If map shows no fix, wait for GNSS lock or check fallback label (approximate).</div>
        <div>- If files are metadata-only, status appears `file_on_pi_not_synced` until sync/proxy path is enabled.</div>
      </div>
    </div>
  );
}
