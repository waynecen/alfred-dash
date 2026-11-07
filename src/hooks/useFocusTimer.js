import { useEffect, useState } from 'react';
import useLocalStorage from './useLocalStorage';
import {
  IDLE,
  PHASE_LABELS,
  finishPhase,
  isPaused,
  isRunning,
  minutesWorked,
  normalizeFocus,
  pause,
  remaining,
  resume,
  startPhase,
  stop,
} from '../data/focus';
import { showNotice } from '../utils/systemNotice';
import { toISODate } from '../utils/dates';

// Keeps the log from growing without end: about a year of daily sessions.
const MAX_SESSIONS = 1000;

const ENDED = {
  work: { title: 'Focus session done', body: 'Time for a break.' },
  break: { title: 'Break over', body: 'Ready for the next focus session.' },
  longBreak: { title: 'Long break over', body: 'Ready for the next focus session.' },
};

// The focus timer, for the whole dashboard: the Focus widget, the "F" key, the palette and the
// browser tab's title all use this one. It lives in App, so it keeps time (and announces the end
// of a phase) whichever board is on screen.
//   notify: shows a toast    noticesOn: the Settings switch for system notices
function useFocusTimer(notify, noticesOn) {
  const [saved, setSaved] = useLocalStorage('focus', IDLE);
  const [sessions, setSessions] = useLocalStorage('focusSessions', []);
  const state = normalizeFocus(saved);
  const [now, setNow] = useState(() => Date.now());

  // Ticks only while a phase runs. Twice a second, so the shown second never lags by a whole one.
  useEffect(() => {
    if (!isRunning(state)) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [state.endsAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (change) => setSaved((current) => change(normalizeFocus(current)));

  function log(entry) {
    if (entry.minutes < 1) return;
    setSessions((current) => [...current, entry].slice(-MAX_SESSIONS));
  }

  // When a phase runs out, move on. The change only happens if the phase is still the one that
  // ended, so a second tab doing the same in the same moment changes nothing and logs nothing.
  useEffect(() => {
    if (!isRunning(state) || now < state.endsAt) return;
    let ended = null;
    update((current) => {
      if (!isRunning(current) || current.endsAt > Date.now()) return current;
      ended = current;
      return finishPhase(current);
    });
    if (!ended) return;
    if (ended.phase === 'work') {
      log({ taskId: ended.taskId, startedAt: ended.startedAt, minutes: ended.lengths.work });
    }
    const { title, body } = ENDED[ended.phase];
    notify({ message: `${title}. ${body}` });
    showNotice(noticesOn, title, { body, tag: 'focus' });
  }, [now, state.endsAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const actions = {
    // Starts a work session, or carries on a paused phase.
    start: (taskId) =>
      update((current) => {
        if (isPaused(current)) return resume(current, Date.now());
        if (isRunning(current)) return current;
        return startPhase({ ...current, taskId: taskId === undefined ? current.taskId : taskId }, Date.now());
      }),
    pause: () => update((current) => pause(current, Date.now())),
    // Start, pause or carry on, as the one "F" key does.
    toggle: () =>
      update((current) => {
        const at = Date.now();
        if (isRunning(current)) return pause(current, at);
        if (isPaused(current)) return resume(current, at);
        return startPhase(current, at);
      }),
    // Ends the phase now. Minutes already worked still count.
    stop: () => {
      let worked = null;
      update((current) => {
        if (current.phase === 'work') worked = { taskId: current.taskId, startedAt: current.startedAt, minutes: minutesWorked(current, Date.now()) };
        return stop(current);
      });
      if (worked) log(worked);
    },
    // Ends this phase as if its time were up: work goes on to its break, a break back to ready.
    // The minutes worked so far still count.
    skip: () => {
      let worked = null;
      update((current) => {
        if (current.phase === 'idle') return current;
        if (current.phase === 'work') worked = { taskId: current.taskId, startedAt: current.startedAt, minutes: minutesWorked(current, Date.now()) };
        return finishPhase({ ...current, endsAt: Date.now(), pausedLeft: null });
      });
      if (worked) log(worked);
    },
    setTask: (taskId) => update((current) => ({ ...current, taskId })),
    setLengths: (lengths) => update((current) => ({ ...current, lengths: { ...current.lengths, ...lengths } })),
  };

  const today = toISODate(now);
  const minutesToday = sessions
    .filter((session) => toISODate(session.startedAt) === today)
    .reduce((sum, session) => sum + session.minutes, 0);

  return {
    focus: {
      ...state,
      running: isRunning(state),
      paused: isPaused(state),
      left: remaining(state, now),
      label: PHASE_LABELS[state.phase],
      minutesToday,
      sessions,
    },
    focusActions: actions,
  };
}

export default useFocusTimer;
