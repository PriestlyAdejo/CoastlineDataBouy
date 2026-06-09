import { Card } from "../../components/Card";
import { EVENT_CLASSES, generateAcousticEvents, AcousticEvent } from "../../components/hydrophone/shared";
import { isBrightonDemo } from "../../lib/demoMode";
import { useDeploymentView } from "../../hooks/useDeploymentView";
import { SettingsRail, SettingsGroup, SettingsToggle, SettingsSelect } from "../../components/hydrophone/SettingsRail";
import { useState, useMemo } from "react";
import { clsx } from "clsx";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ZAxis } from "recharts";
import { X, Download, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { FutureAnalysisPlaceholder } from "../../components/hydrophone/FutureAnalysisPlaceholder";
import { ReplayAnalyticsBanner } from "../../components/hydrophone/ReplayAnalyticsBanner";

const clydeEvents = generateAcousticEvents(80);

function EventDetailPanel({ event, onClose }: { event: AcousticEvent; onClose: () => void }) {
  const cls = EVENT_CLASSES.find((c) => c.id === event.eventClass);
  const d = new Date(event.timestamp);

  // Generate mini waveform
  const waveform = Array.from({ length: 100 }, (_, i) => ({
    t: i,
    amp: Math.sin(i * 0.2 + event.peakLevel) * (0.3 + Math.random() * 0.7) * 50,
  }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[480px] h-full bg-slate-900 border-l border-slate-800 shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cls?.color }} />
            <div>
              <span className="text-sm font-semibold text-slate-100">{event.id}</span>
              <span className="text-xs text-slate-500 ml-2">{cls?.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Timestamp", value: d.toLocaleString() },
              { label: "Duration", value: `${event.duration}s` },
              { label: "Confidence", value: `${Math.round(event.confidence * 100)}%` },
              { label: "Peak Level", value: `${event.peakLevel} dB` },
              { label: "Dominant Band", value: event.dominantBand },
              { label: "Reviewed", value: event.reviewed ? "Yes" : "Pending" },
            ].map((m) => (
              <div key={m.label} className="bg-slate-800/50 rounded-md p-3 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-500 uppercase">{m.label}</div>
                <div className="text-sm text-slate-200 font-mono mt-0.5">{m.value}</div>
              </div>
            ))}
          </div>

          {/* Preview Waveform */}
          <Card title="Waveform Preview" action={<span className="text-[10px] font-mono text-slate-500">~{event.duration}s segment</span>}>
            <div className="h-24 mt-2 bg-slate-900/50 rounded border border-slate-800 flex items-center px-2">
              {waveform.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-center h-full">
                  <div className="w-px bg-cyan-400/60" style={{ height: `${Math.abs(w.amp)}%` }} />
                </div>
              ))}
            </div>
          </Card>

          {/* Preview Spectrogram */}
          <Card title="Spectrogram Preview">
            <div className="h-32 mt-2 rounded border border-slate-800 overflow-hidden relative bg-slate-900">
              <div className="absolute inset-0 flex flex-col">
                {Array.from({ length: 16 }).map((_, f) => (
                  <div key={f} className="flex-1 flex">
                    {Array.from({ length: 40 }).map((_, t) => {
                      const isEvent = t > 12 && t < 28 && f > 3 && f < 12;
                      const intensity = isEvent ? 0.4 + Math.random() * 0.6 : Math.random() * 0.15;
                      return (
                        <div key={t} className="flex-1" style={{
                          backgroundColor: intensity > 0.7 ? '#ef4444' : intensity > 0.5 ? '#f59e0b' : intensity > 0.3 ? '#06b6d4' : intensity > 0.1 ? '#1e293b' : 'transparent',
                          opacity: intensity,
                        }} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Band Energy */}
          <Card title="Band Energy Breakdown">
            <div className="space-y-2 mt-2">
              {[
                { band: "10-100 Hz", pct: 35, color: "#f59e0b" },
                { band: "100-1k Hz", pct: 45, color: "#06b6d4" },
                { band: "1-10 kHz", pct: 15, color: "#8b5cf6" },
                { band: "10-24 kHz", pct: 5, color: "#64748b" },
              ].map((b) => (
                <div key={b.band} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-500 w-20">{b.band}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${b.pct}%`, backgroundColor: b.color }} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{b.pct}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {["Likely " + cls?.label?.toLowerCase(), event.confidence > 0.8 ? "High confidence" : "Moderate confidence", event.reviewed ? "Reviewed" : "Unreviewed"].map((tag) => (
              <span key={tag} className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400">{tag}</span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors">
              <Download size={13} /> Download Chunk
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors">
              <ExternalLink size={13} /> Open Source File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AcousticEvents() {
  if (!isBrightonDemo()) return <FutureAnalysisPlaceholder title="Acoustic event candidates" />;
  const vm = useDeploymentView();
  const allEvents = useMemo<AcousticEvent[]>(() => {
    if (!isBrightonDemo() || !vm) return clydeEvents;
    return vm.acoustic.events.map((e) => ({
      id: e.id,
      eventClass: e.cls as AcousticEvent["eventClass"],
      timestamp: vm.replayTimeMs,
      hour: new Date(vm.replayTimeMs).getHours(),
      duration: 12,
      confidence: e.confidence,
      peakLevel: parseFloat(e.level) || 60,
      dominantBand: "lf",
      reviewed: e.reviewed,
    }));
  }, [vm, vm?.replayTimeMs, vm?.phase.id]);

  const [selectedEvent, setSelectedEvent] = useState<AcousticEvent | null>(null);
  const [classFilter, setClassFilter] = useState("all");
  const [showReviewedOnly, setShowReviewedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 15;

  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      if (classFilter !== "all" && e.eventClass !== classFilter) return false;
      if (showReviewedOnly && !e.reviewed) return false;
      return true;
    });
  }, [allEvents, classFilter, showReviewedOnly]);

  const scatterData = filtered.map((e) => ({
    ...e,
    x: new Date(e.timestamp).getDate(),
    y: e.hour,
    z: Math.max(e.duration, 10),
    color: EVENT_CLASSES.find((c) => c.id === e.eventClass)?.color || '#64748b',
  }));

  const pagedEvents = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        <ReplayAnalyticsBanner />
        <Card title="Acoustic event candidates" action={<span className="text-[10px] font-mono dash-text-faint">{filtered.length} candidates · prototype · not confirmed detections</span>}>
          <div className="h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
                <XAxis type="number" dataKey="x" name="Day" domain={[3, 17]} tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} label={{ value: 'Day of Month', position: 'insideBottom', offset: -2, style: { fill: '#475569', fontSize: 9 } }} />
                <YAxis type="number" dataKey="y" name="Hour" domain={[0, 24]} tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} label={{ value: 'Hour (UTC)', angle: -90, position: 'insideLeft', offset: 15, style: { fill: '#475569', fontSize: 9 } }} />
                <ZAxis type="number" dataKey="z" range={[20, 200]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const e = payload[0].payload as AcousticEvent & { color: string };
                    const cls = EVENT_CLASSES.find((c) => c.id === e.eventClass);
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-md p-3 shadow-xl text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                          <span className="font-semibold text-slate-200">{cls?.label}</span>
                        </div>
                        <div className="font-mono text-slate-400 space-y-0.5">
                          <div>{e.id} | {new Date(e.timestamp).toLocaleString()}</div>
                          <div>Duration: {e.duration}s | Peak: {e.peakLevel} dB</div>
                          <div>Confidence: {Math.round(e.confidence * 100)}%</div>
                        </div>
                      </div>
                    );
                  }}
                />
                {EVENT_CLASSES.filter((c) => c.status === 'active').map((cls) => (
                  <Scatter
                    key={cls.id}
                    data={scatterData.filter((d) => d.eventClass === cls.id)}
                    fill={cls.color}
                    fillOpacity={0.7}
                    onClick={(data) => setSelectedEvent(data as any)}
                    cursor="pointer"
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-3 mt-2 flex-wrap">
            {EVENT_CLASSES.filter((c) => c.status === 'active').map((cls) => (
              <div key={cls.id} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cls.color }} />
                {cls.label}
              </div>
            ))}
          </div>
        </Card>

        {/* Event List */}
        <Card title="Event Log">
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  {["ID", "Class", "Timestamp", "Duration", "Peak dB", "Band", "Conf.", "Status"].map((h) => (
                    <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedEvents.map((e) => {
                  const cls = EVENT_CLASSES.find((c) => c.id === e.eventClass);
                  return (
                    <tr key={e.id}
                      onClick={() => setSelectedEvent(e)}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="py-2 px-2 font-mono text-cyan-400">{e.id}</td>
                      <td className="py-2 px-2">
                        <span className="inline-flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cls?.color }} />
                          <span className="text-slate-300">{cls?.label}</span>
                        </span>
                      </td>
                      <td className="py-2 px-2 font-mono text-slate-400">{new Date(e.timestamp).toLocaleString()}</td>
                      <td className="py-2 px-2 font-mono text-slate-400">{e.duration}s</td>
                      <td className="py-2 px-2 font-mono text-slate-300">{e.peakLevel}</td>
                      <td className="py-2 px-2 font-mono text-slate-500">{e.dominantBand}</td>
                      <td className="py-2 px-2 font-mono">
                        <span className={e.confidence >= 0.8 ? "text-emerald-400" : e.confidence >= 0.6 ? "text-amber-400" : "text-slate-500"}>
                          {Math.round(e.confidence * 100)}%
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={clsx("text-[10px] font-mono px-1.5 py-0.5 rounded border",
                          e.reviewed ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-slate-500 bg-slate-800 border-slate-700"
                        )}>
                          {e.reviewed ? "Reviewed" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] font-mono text-slate-500">{filtered.length} events</span>
            <div className="flex items-center gap-2">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-[10px] font-mono text-slate-400">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Settings */}
      <SettingsRail>
        <SettingsGroup label="Filter by Class">
          <SettingsSelect label="" value={classFilter} onChange={(v) => { setClassFilter(v); setPage(0); }} options={[
            { value: "all", label: "All classes" },
            ...EVENT_CLASSES.filter((c) => c.status === "active").map((c) => ({ value: c.id, label: c.label })),
          ]} />
        </SettingsGroup>
        <SettingsGroup label="Display">
          <SettingsToggle label="Reviewed only" checked={showReviewedOnly} onChange={(v) => { setShowReviewedOnly(v); setPage(0); }} />
        </SettingsGroup>
      </SettingsRail>

      {/* Event Detail Drawer */}
      {selectedEvent && <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
