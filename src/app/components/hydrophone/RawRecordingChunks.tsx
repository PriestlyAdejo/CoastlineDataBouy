import { Fragment, useEffect, useMemo, useState } from "react";
import { Card } from "../Card";
import { StatusBadge } from "../Widgets";
import { createApiClient, type FileItem } from "../../api/client";
import { useLiveNode } from "../LiveNodeProvider";
import { formatSplDisplay } from "../../lib/acousticDisplay";
import { clsx } from "clsx";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

type FilterKind = "all" | "audio" | "metadata" | "available" | "not_synced";

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
  return {
    tsStart,
    tsEnd,
    duration,
    formatLabel,
    filePath: String(p.file_path ?? artifact.path ?? "—"),
    calibration: String(p.calibration_status ?? "uncalibrated"),
    rms: metrics.rms_dbfs ?? metrics.leq_db ?? metrics.rms_db,
    peak: metrics.peak_dbfs ?? metrics.peak_db,
    size: artifact.size_bytes ?? p.size_bytes,
  };
}

export function RawRecordingChunks() {
  const live = useLiveNode();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    let rows = [...files];
    if (filter === "audio") rows = rows.filter((f) => f.type.toLowerCase().includes("wav"));
    if (filter === "metadata") rows = rows.filter((f) => f.status === "metadata_only");
    if (filter === "available") rows = rows.filter((f) => f.available);
    if (filter === "not_synced") rows = rows.filter((f) => !f.available);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((f) => f.filename.toLowerCase().includes(q));
    }
    return rows;
  }, [files, filter, search]);

  const latestMeta = parseAcousticPayload(live?.acoustics);

  return (
    <Card
      title="Raw recording chunks"
      action={
        <span className="text-xs font-mono dash-text-faint">
          {files.length} indexed · SPL uncalibrated unless stated
        </span>
      }
    >
      {live?.acoustics && (
        <div className="mb-4 rounded-lg border p-3 text-xs font-mono space-y-1" style={{ borderColor: "var(--dash-panel-border)" }}>
          <div className="dash-text-secondary font-semibold uppercase tracking-wide mb-1">Latest snapshot metadata</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 dash-text-faint">
            <span>Start: {latestMeta.tsStart || "—"}</span>
            <span>End: {latestMeta.tsEnd || "—"}</span>
            <span>Format: {latestMeta.formatLabel}</span>
            <span>Calibration: {latestMeta.calibration}</span>
            <span className="col-span-2 md:col-span-4 truncate">Path: {latestMeta.filePath}</span>
            {(latestMeta.rms != null || latestMeta.peak != null) && (
              <>
                <span>RMS: {formatSplDisplay(Number(latestMeta.rms), latestMeta.calibration)}</span>
                <span>Peak: {formatSplDisplay(Number(latestMeta.peak), latestMeta.calibration)}</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3 items-center">
        {(
          [
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
                <th className="text-left py-2 pr-3">Size</th>
                <th className="text-left py-2 pr-3">Sync</th>
                <th className="text-left py-2">Calibration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const meta = parseAcousticPayload((f as FileItem & { payload?: unknown }).payload);
                const open = expanded === f.file_id;
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
                      <td className="py-2 pr-3 dash-text-secondary">{f.timestamp ?? meta.tsEnd ?? "—"}</td>
                      <td className="py-2 pr-3 dash-text-primary truncate max-w-[200px]">{f.filename}</td>
                      <td className="py-2 pr-3 dash-text-faint">{meta.duration}</td>
                      <td className="py-2 pr-3 dash-text-faint">{meta.formatLabel}</td>
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
                        <td colSpan={8} className="py-2 pb-3">
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
