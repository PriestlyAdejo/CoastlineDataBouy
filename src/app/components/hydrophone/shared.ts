// Shared constants and types for the Hydrophone acoustic analytics suite

export const EVENT_CLASSES = [
  { id: 'vessel', label: 'Vessel Passage', color: '#f59e0b', status: 'active' as const },
  { id: 'wave', label: 'Wave / Surf', color: '#06b6d4', status: 'active' as const },
  { id: 'rain', label: 'Rain / Weather', color: '#8b5cf6', status: 'active' as const },
  { id: 'port', label: 'Port / Machinery', color: '#ef4444', status: 'active' as const },
  { id: 'transient', label: 'Broadband Transient', color: '#f97316', status: 'active' as const },
  { id: 'unknown', label: 'Unknown Anomaly', color: '#64748b', status: 'active' as const },
  { id: 'propeller', label: 'Propeller / Cavitation', color: '#eab308', status: 'experimental' as const },
  { id: 'anchor', label: 'Anchor / Chain', color: '#a3e635', status: 'experimental' as const },
  { id: 'bioacoustic', label: 'Bioacoustic / Natural', color: '#34d399', status: 'future' as const },
  { id: 'sediment', label: 'Sediment / Debris', color: '#94a3b8', status: 'future' as const },
] as const;

export type EventClassId = typeof EVENT_CLASSES[number]['id'];
export type ClassifierStatus = 'active' | 'experimental' | 'future';

export const CLASSIFIER_STATUS_STYLES: Record<ClassifierStatus, { bg: string; text: string; border: string; label: string }> = {
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Active' },
  experimental: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Experimental' },
  future: { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-600', label: 'Future' },
};

export const FREQUENCY_BANDS = [
  { id: 'vlf', label: '10-100 Hz', desc: 'Vessel / flow / swell' },
  { id: 'lf', label: '100-1k Hz', desc: 'Coastal activity / machinery' },
  { id: 'mf', label: '1-10 kHz', desc: 'Rain / spray / transients' },
  { id: 'hf', label: '10-24 kHz', desc: 'Surface effects / high-freq' },
  { id: 'broadband', label: 'Broadband', desc: 'Full spectrum' },
];

// Generate deterministic-ish mock data
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export function generateDailyEventData(days: number = 30) {
  const data = [];
  const baseDate = new Date(2026, 2, 17); // Mar 17 2026
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const effort = 70 + seededRandom(i * 7) * 30;
    data.push({
      date: d.toISOString().slice(0, 10),
      label: `${d.getDate()} Mar`,
      vessel: Math.floor(seededRandom(i * 1) * 8),
      wave: Math.floor(seededRandom(i * 2) * 15 + 5),
      rain: Math.floor(seededRandom(i * 3) * 6),
      port: Math.floor(seededRandom(i * 4) * 4),
      transient: Math.floor(seededRandom(i * 5) * 3),
      unknown: Math.floor(seededRandom(i * 6) * 2),
      effort: Math.round(effort),
      lowEffort: effort < 80,
    });
  }
  return data;
}

export function generateSoundLevelData(days: number = 30) {
  const data = [];
  const baseDate = new Date(2026, 2, 17);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toISOString().slice(0, 10),
      label: `${d.getDate()} Mar`,
      vlf: 85 + seededRandom(i * 11) * 25,
      lf: 75 + seededRandom(i * 12) * 20,
      mf: 60 + seededRandom(i * 13) * 18,
      hf: 45 + seededRandom(i * 14) * 15,
      broadband: 90 + seededRandom(i * 15) * 20,
    });
  }
  return data;
}

export function generateRecordingEffortData(days: number = 60) {
  const data = [];
  const baseDate = new Date(2026, 2, 17);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const effort = i === 22 || i === 23 ? seededRandom(i) * 30 : 65 + seededRandom(i * 99) * 35;
    data.push({
      date: d.toISOString().slice(0, 10),
      label: `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      effort: Math.round(Math.min(100, effort)),
      gaps: Math.max(0, Math.floor((100 - effort) / 10)),
    });
  }
  return data;
}

export function generateHourlySpectrogramData() {
  const rows = 32; // frequency bins
  const cols = 24; // hours
  const data: number[][] = [];
  for (let f = 0; f < rows; f++) {
    const row: number[] = [];
    for (let h = 0; h < cols; h++) {
      // vessel activity peaks 6-9 and 16-19 in low freq
      const vesselPeak = (h >= 6 && h <= 9 || h >= 16 && h <= 19) && f < 8 ? 20 : 0;
      // wave noise is broadband but stronger mid
      const waveNoise = f > 4 && f < 20 ? 10 + seededRandom(f * 100 + h) * 8 : 0;
      // base noise
      const base = 40 + seededRandom(f * 50 + h * 3) * 15 + vesselPeak + waveNoise;
      row.push(Math.round(Math.min(120, base)));
    }
    data.push(row);
  }
  return data;
}

export function generateSpectralDensityData() {
  const freqs = [];
  for (let f = 10; f <= 24000; f *= 1.1) {
    const freq = Math.round(f);
    const base = 110 - Math.log10(f) * 20;
    freqs.push({
      freq,
      freqLabel: freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : `${freq}`,
      l05: base + 15 + seededRandom(freq) * 5,
      l50: base + seededRandom(freq * 2) * 5,
      l95: base - 15 + seededRandom(freq * 3) * 5,
      leq: base + 3 + seededRandom(freq * 4) * 3,
    });
  }
  return freqs;
}

export interface AcousticEvent {
  id: string;
  timestamp: string;
  eventClass: EventClassId;
  duration: number; // seconds
  confidence: number; // 0-1
  peakLevel: number; // dB
  dominantBand: string;
  hour: number;
  reviewed: boolean;
}

export function generateAcousticEvents(count: number = 80): AcousticEvent[] {
  const classes: EventClassId[] = ['vessel', 'wave', 'rain', 'port', 'transient', 'unknown'];
  const bands = ['10-100 Hz', '100-1k Hz', '1-10 kHz', 'Broadband'];
  const events: AcousticEvent[] = [];
  const baseDate = new Date(2026, 2, 17);
  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - Math.floor(seededRandom(i * 77) * 14));
    const hour = Math.floor(seededRandom(i * 33) * 24);
    d.setHours(hour, Math.floor(seededRandom(i * 44) * 60));
    events.push({
      id: `EVT-${String(1000 + i).slice(1)}`,
      timestamp: d.toISOString(),
      eventClass: classes[Math.floor(seededRandom(i * 55) * classes.length)],
      duration: Math.round(5 + seededRandom(i * 66) * 120),
      confidence: Math.round((0.4 + seededRandom(i * 88) * 0.6) * 100) / 100,
      peakLevel: Math.round(60 + seededRandom(i * 99) * 50),
      dominantBand: bands[Math.floor(seededRandom(i * 22) * bands.length)],
      hour,
      reviewed: seededRandom(i * 111) > 0.6,
    });
  }
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
