import { BRIGHTON_PHASES, parseReplayMs, phaseAtTime, phaseById, TEST_DAY_START } from "./brightonPhases";

const LS_TIME = "nereus.replayTime";
const LS_PAUSED = "nereus.replayPaused";
const LS_SPEED = "nereus.replaySpeed";
const LS_PHASE = "nereus.replayPhase";

export type ReplayClockState = {
  replayTimeMs: number;
  paused: boolean;
  speed: number;
  phaseId: string | null;
};

export function loadReplayClock(): ReplayClockState {
  if (typeof window === "undefined") {
    return { replayTimeMs: parseReplayMs(TEST_DAY_START), paused: false, speed: 1, phaseId: null };
  }
  const t = window.localStorage.getItem(LS_TIME);
  const paused = window.localStorage.getItem(LS_PAUSED) === "true";
  const speed = Number(window.localStorage.getItem(LS_SPEED) || "1") || 1;
  const phaseId = window.localStorage.getItem(LS_PHASE);
  return {
    replayTimeMs: t ? parseReplayMs(t) : parseReplayMs(TEST_DAY_START),
    paused,
    speed: Math.max(0.1, speed),
    phaseId,
  };
}

export function persistReplayClock(state: ReplayClockState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_TIME, new Date(state.replayTimeMs).toISOString());
  window.localStorage.setItem(LS_PAUSED, String(state.paused));
  window.localStorage.setItem(LS_SPEED, String(state.speed));
  if (state.phaseId) window.localStorage.setItem(LS_PHASE, state.phaseId);
  else window.localStorage.removeItem(LS_PHASE);
}

export function clampToTestDay(ms: number): number {
  const start = parseReplayMs(TEST_DAY_START);
  const end = parseReplayMs("2026-05-01T23:59:59+01:00");
  return Math.max(start, Math.min(ms, end));
}

export function getCurrentReplayTimeMs(state: ReplayClockState): number {
  return clampToTestDay(state.replayTimeMs);
}

export function getCurrentPhase(state: ReplayClockState) {
  if (state.phaseId) {
    const p = phaseById(state.phaseId);
    if (p) return p;
  }
  return phaseAtTime(getCurrentReplayTimeMs(state));
}

export function setReplayTimeMs(state: ReplayClockState, ms: number): ReplayClockState {
  const next = { ...state, replayTimeMs: clampToTestDay(ms), phaseId: null };
  persistReplayClock(next);
  return next;
}

export function jumpToPhase(state: ReplayClockState, phaseId: string): ReplayClockState {
  const p = phaseById(phaseId);
  if (!p) return state;
  const next = { ...state, replayTimeMs: parseReplayMs(p.start), phaseId: p.id };
  persistReplayClock(next);
  return next;
}

export function pauseReplay(state: ReplayClockState): ReplayClockState {
  const next = { ...state, paused: true };
  persistReplayClock(next);
  return next;
}

export function resumeReplay(state: ReplayClockState): ReplayClockState {
  const next = { ...state, paused: false };
  persistReplayClock(next);
  return next;
}

export function setReplaySpeed(state: ReplayClockState, speed: number): ReplayClockState {
  const next = { ...state, speed: Math.max(0.1, speed) };
  persistReplayClock(next);
  return next;
}

/** Advance clock by real deltaMs * speed (field-test timeline). */
export function tickReplayClock(state: ReplayClockState, realDeltaMs: number): ReplayClockState {
  if (state.paused) return state;
  const nextMs = clampToTestDay(state.replayTimeMs + realDeltaMs * state.speed);
  const next = { ...state, replayTimeMs: nextMs, phaseId: phaseAtTime(nextMs).id };
  persistReplayClock(next);
  return next;
}

export function resetReplayToStart(): ReplayClockState {
  return jumpToPhase(loadReplayClock(), "pre_record");
}

export const REPLAY_SPEED_PRESETS = [1, 5, 30, 60] as const;

export function listPhases() {
  return BRIGHTON_PHASES;
}
