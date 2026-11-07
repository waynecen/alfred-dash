// The focus timer (a Pomodoro): work, then a short break, and a long break after every few work
// sessions. Saved under the 'focus' key as when the current phase ends, not as a count that ticks
// down, so a reload, a second tab or a computer that slept all agree on how long is left.
//   phase: 'idle' | 'work' | 'break' | 'longBreak'
//   endsAt: when the running phase ends (ms), or null when idle or paused
//   pausedLeft: ms left in a paused phase, or null
//   startedAt: when the current work session began (ms), for the log
//   taskId: the task being worked on, or null
//   round: work sessions finished since the last long break
//   lengths: { work, break, longBreak } in minutes, and every: work sessions per long break
// Each finished work session is logged under 'focusSessions': [{ taskId, startedAt, minutes }].

export const DEFAULT_LENGTHS = { work: 25, break: 5, longBreak: 15, every: 4 };

export const IDLE = {
  phase: 'idle',
  endsAt: null,
  pausedLeft: null,
  startedAt: null,
  taskId: null,
  round: 0,
  lengths: DEFAULT_LENGTHS,
};

export const PHASE_LABELS = { idle: 'Ready', work: 'Focus', break: 'Break', longBreak: 'Long break' };

// Fills in anything an older or damaged save is missing.
export const normalizeFocus = (state) => ({
  ...IDLE,
  ...state,
  lengths: { ...DEFAULT_LENGTHS, ...state?.lengths },
});

const minutes = (n) => n * 60 * 1000;

export const isRunning = (state) => state.endsAt !== null;
export const isPaused = (state) => state.pausedLeft !== null;

// Ms left in the phase: counted from endsAt while running, held while paused.
export function remaining(state, now) {
  if (isPaused(state)) return state.pausedLeft;
  if (isRunning(state)) return Math.max(0, state.endsAt - now);
  return minutes(state.lengths.work);
}

// Begins a phase (work, unless told otherwise) from now.
export function startPhase(state, now, phase = 'work') {
  return {
    ...state,
    phase,
    endsAt: now + minutes(state.lengths[phase]),
    pausedLeft: null,
    startedAt: phase === 'work' ? now : state.startedAt,
  };
}

export const pause = (state, now) =>
  isRunning(state) ? { ...state, endsAt: null, pausedLeft: Math.max(0, state.endsAt - now) } : state;

export const resume = (state, now) =>
  isPaused(state) ? { ...state, endsAt: now + state.pausedLeft, pausedLeft: null } : state;

// Back to ready, keeping the lengths and the task. The round carries on unless reset.
export const stop = (state) => ({ ...IDLE, lengths: state.lengths, taskId: state.taskId, round: state.round });

// What comes after the phase that just ended, from the moment it ended: work leads to a break
// (a long one every few rounds), which starts by itself; a break leads back to ready, so the
// next work session starts when the user is.
export function finishPhase(state) {
  const endedAt = state.endsAt;
  if (state.phase === 'work') {
    const round = state.round + 1;
    const next = round % state.lengths.every === 0 ? 'longBreak' : 'break';
    return startPhase({ ...state, round: next === 'longBreak' ? 0 : round }, endedAt, next);
  }
  return { ...stop(state) };
}

// How much of a work session was actually worked, in whole minutes, when it is stopped early.
export function minutesWorked(state, now) {
  if (state.phase !== 'work') return 0;
  return Math.floor((minutes(state.lengths.work) - remaining(state, now)) / 60000);
}

// "24:59", or "1:02:03" for a very long phase.
export function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
