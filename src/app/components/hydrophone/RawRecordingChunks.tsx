import { Fragment, useEffect, useMemo, useState } from "react";
import { Card } from "../Card";
import { StatusBadge } from "../Widgets";
import { createApiClient, type FileItem } from "../../api/client";
import { useLiveNode } from "../LiveNodeProvider";
import { formatSplDisplay } from "../../lib/acousticDisplay";
import { clsx } from "clsx";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

type FilterKind = "all" | "audio" | "metadata" | "available" | "not_synced" | "recent";

const STALE_MS = 24 * 60 * 60 * 1000;

function formatBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function parseAcousticPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return {};
  const p = payload as Record<string, unknown>;
  const fmt = (p.format ?? {}) as Record<string, unknown>;
  const artifact = (p.artifact ?? {}) as Record<string, unknown>;
  const device = (p.device ?? {}) as Record<string, unknown>;
  const metrics = (p.display_metrics ?? {}) as Record<string, unknown>;
  const tsStart = String(p.ts_start ?? p.ts ?? "");
  const tsEnd = String(p.ts_end ?? "");
  let duration = "—";
  if (tsStart && tsEnd) {
    const a = Date.parse(tsStart);
    const b = Date.parse(tsEnd);
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
      const sec = (b - a) / 1000;
      duration = sec >= 3600 ? `${(sec / 3600).toFixed(2)} h` : `${sec.toFixed(0)} s`;
    }
  }
  const sr = fmt.sample_rate_hz;
  const ch = fmt.channels;
  const bit = fmt.bit_depth;
  const formatLabel = [sr != null ? `${sr} Hz` : null, ch != null ? `${ch} ch` : null, bit != null ? `${bit}-bit` : null]
    .filter(Boolean)
    .join(" · ") || String(fmt.codec ?? "—");
  const sortTs = Date.parse(tsEnd || tsStart || "");
  return {
    tsStart,
    tsEnd,
    sortTs: Number.isFinite(sortTs) ? sortTs : 0,
    duration,
    formatLabel,
    filePath: String(p.file_path ?? artifact.path ?? "—"),
    captureDevice: String(device.hw_id ?? device.card_name ?? p.capture_device ?? "—"),
    calibration: String(p.calibration_status ?? "uncalibrated"),
    rms: metrics.rms_dbfs ?? metrics.leq_db ?? metrics.rms_db,
    peak: metrics.peak_dbfs ?? metrics.peak_db,
    clippingPct: metrics.clipping_pct,
    crestFactor: metrics.crest_factor,
    size: artifact.size_bytes ?? p.size_bytes,
  };
}

function isStaleRow(ts: string | undefined, sortTs: number): boolean {
  if (sortTs > 0) return Date.now() - sortTs > STALE_MS;
  if (!ts) return true;
  const ms = Date.parse(ts);
  return !Number.isFinite(ms) || Date.now() - ms > STALE_MS;
}

export function RawRecordingChunks() {
  const live = useLiveNode();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filter, setFilter] = useState<FilterKind>("recent");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showHistorical, setShowHistorical] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await createApiClient().listFiles();
        setFiles(data.items ?? []);
      } catch {
        setFiles([]);
      }
    };
    void load();
  }, [live?.lastUpdateIso]);

  const sorted = useMemo(
    () =>
      [...files].sort((a, b) => {
        const ma = parseAcousticPayload((a as FileItem & { payload?: unknown }).payload);
        const mb = parseAcousticPayload((b as FileItem & { payload?: unknown }).payload);
        return (mb.sortTs || Date.parse(b.timestamp ?? "")) - (ma.sortTs || Date.parse(a.timestamp ?? ""));
      }),
    [files],
  );

  const filtered = useMemo(() => {
    let rows = [...sorted];
    if (filter === "audio") rows = rows.filter((f) => f.type.toLowerCase().includes("wav"));
    if (filter === "metadata") rows = rows.filter((f) => f.status === "metadata_only");
    if (filter === "available") rows = rows.filter((f) => f.available);
    if (filter === "not_synced") rows = rows.filter((f) => !f.available);
    if (filter === "recent" && !showHistorical) {
      rows = rows.filter((f) => {
        const meta = parseAcousticPayload((f as FileItem & { payload?: unknown }).payload);
        return !isStaleRow(f.timestamp ?? meta.tsEnd, meta.sortTs);
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((f) => f.filename.toLowerCase().includes(q));
    }
    return rows;
  }, [sorted, filter, search, showHistorical]);

  const latestMeta = parseAcousticPayload(live?.acoustics);
  const staleCount = sorted.filter((f) => {
    const meta = parseAcousticPayload((f as FileItem & { payload?: unknown }).payload);
    return isStaleRow(f.timestamp ?? meta.tsEnd, meta.sortTs);
  }).length;

  return (
    <Card
      title="Raw recording chunks"
      action={
        <span className="text-xs font-mono dash-text-faint">
          {files.length} indexed · uncalibrated dBFS only
        </span>
      }
    >
      {live?.acoustics && (
        <div className="mb-4 rounded-lg border p-3 text-xs font-mono space-y-1" style={{ borderColor: "var(--dash-panel-border)" }}>
          <div className="dash-text-secondary font-semibold uppercase tracking-wide mb-1">Latest snapshot metadata</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 dash-text-faint">
            <span>Start: {latestMeta.tsStart || "—"}</span>
            <span>End: {latestMeta.tsEnd || "—"}</span>
            <span>Duration: {latestMeta.duration}</span>
            <span>Format: {latestMeta.formatLabel}</span>
            <span>Device: {latestMeta.captureDevice}</span>
            <span>Size: {formatBytes(Number(latestMeta.size))}</span>
            <span>Calibration: {latestMeta.calibration}</span>
            <span className="col-span-2 md:col-span-4 break-all">Path: {latestMeta.filePath}</span>
            {(latestMeta.rms != null || latestMeta.peak != null) && (
              <>
                <span>RMS: {formatSplDisplay(Number(latestMeta.rms), latestMeta.calibration)}</span>
                <span>Peak: {formatSplDisplay(Number(latestMeta.peak), latestMeta.calibration)}</span>
              </>
            )}
            {latestMeta.clippingPct != null && <span>Clipping: {Number(latestMeta.clippingPct).toFixed(2)}%</span>}
            {latestMeta.crestFactor != null && <span>Crest: {Number(latestMeta.crestFactor).toFixed(2)}</span>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3 items-center">
        {(
          [
            ["recent", "Recent (24h)"],
            ["all", "All"],
            ["audio", "Audio only"],
            ["metadata", "Metadata only"],
            ["available", "Downloadable"],
            ["not_synced", "On Pi only"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={clsx(
              "px-2 py-1 rounded text-xs font-medium border transition-colors",
              filter === id ? "text-[var(--dash-accent)] border-[var(--dash-accent)]" : "dash-text-faint",
            )}
            style={{ borderColor: filter === id ? undefined : "var(--dash-panel-border)" }}
          >
            {label}
          </button>
        ))}
        {staleCount > 0 && (
          <button
            type="button"
            onClick={() => setShowHistorical((v) => !v)}
            className="px-2 py-1 rounded text-xs font-medium border dash-text-faint"
            style={{ borderColor: "var(--dash-panel-border)" }}
          >
            {showHistorical ? "Hide" : "Show"} historical ({staleCount})
          </button>
        )}
        <div className="flex items-center gap-1 ml-auto border rounded px-2 py-1" style={{ borderColor: "var(--dash-panel-border)" }}>
          <Search size={12} className="dash-text-faint" />
          <input
            type="text"
            placeholder="Search filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs outline-none w-36 dash-text-primary placeholder:dash-text-faint"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm dash-text-secondary py-8 text-center">No recording chunks synced yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="dash-text-faint border-b" style={{ borderColor: "var(--dash-panel-border)" }}>
                <th className="text-left py-2 pr-2 w-6" />
                <th className="text-left py-2 pr-3">Timestamp</th>
                <th className="text-left py-2 pr-3">Filename</th>
                <th className="text-left py-2 pr-3">Duration</th>
                <th className="text-left py-2 pr-3">Format</th>
                <th className="text-left py-2 pr-3">Device</th>
                <th className="text-left py-2 pr-3">Size</th>
                <th className="text-left py-2 pr-3">Sync</th>
                <th className="text-left py-2">Calibration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const meta = parseAcousticPayload((f as FileItem & { payload?: unknown }).payload);
                const open = expanded === f.file_id;
                const stale = isStaleRow(f.timestamp ?? meta.tsEnd, meta.sortTs);
                return (
                  <Fragment key={f.file_id}>
                    <tr
                      className="border-b cursor-pointer hover:opacity-90"
                      style={{ borderColor: "var(--dash-panel-border)" }}
                      onClick={() => setExpanded(open ? null : f.file_id)}
                    >
                      <td className="py-2 pr-2 dash-text-faint">
                        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </td>
                      <td className="py-2 pr-3 dash-text-secondary whitespace-nowrap">
                        {f.timestamp ?? meta.tsEnd ?? "—"}
                        {stale && (
                          <span className="ml-1 text-[10px] uppercase text-[var(--dash-warning)]">historical</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 dash-text-primary max-w-[180px] truncate">{f.filename}</td>
                      <td className="py-2 pr-3 dash-text-faint">{meta.duration}</td>
                      <td className="py-2 pr-3 dash-text-faint">{meta.formatLabel}</td>
                      <td className="py-2 pr-3 dash-text-faint max-w-[100px] truncate">{meta.captureDevice}</td>
                      <td className="py-2 pr-3 dash-text-faint">{formatBytes(f.size_bytes ?? Number(meta.size))}</td>
                      <td className="py-2 pr-3">
                        <StatusBadge status={f.available ? "success" : "warning"}>
                          {f.available ? "available" : "file_on_pi_not_synced"}
                        </StatusBadge>
                      </td>
                      <td className="py-2 dash-text-faint">{meta.calibration}</td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={9} className="py-2 pb-3">
                          <pre className="text-[10px] p-2 rounded overflow-x-auto max-h-48 dash-text-faint" style={{ backgroundColor: "var(--dash-bg)" }}>
                            {JSON.stringify((f as FileItem & { payload?: unknown }).payload ?? f, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
