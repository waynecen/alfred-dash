import { useId } from 'react';
import { formatClock } from '../../data/focus';
import { plural } from '../../utils/text';
import './FocusWidget.css';

const LENGTH_FIELDS = [
  { key: 'work', label: 'Focus', unit: 'min', max: 180 },
  { key: 'break', label: 'Break', unit: 'min', max: 60 },
  { key: 'longBreak', label: 'Long break', unit: 'min', max: 120 },
  { key: 'every', label: 'Long break every', unit: 'sessions', max: 12 },
];

// "24 minutes 59 seconds", for the timer's accessible name (read when focused, never every second).
function spoken(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return [m && plural(m, 'minute'), s && plural(s, 'second')].filter(Boolean).join(' ') || '0 seconds';
}

// The Focus widget: a big countdown set in the display size, what phase it is, and the controls.
// The timer itself lives in App (useFocusTimer), so it keeps going on any board.
//   focus: the timer's state (see hooks/useFocusTimer.js)   actions: start, pause, stop, skip, …
//   tasks: the task list, for "Working on"
function FocusWidget({ focus, actions, tasks }) {
  const id = useId();
  const openTasks = tasks.filter((task) => !task.completed);
  const task = tasks.find((t) => t.id === focus.taskId);
  const idle = focus.phase === 'idle';
  const every = focus.lengths.every;
  // Rounds done in this cycle; during a long break the whole cycle is done.
  const done = focus.phase === 'longBreak' ? every : focus.round;

  return (
    <div className="focus" data-phase={focus.phase}>
      <div className="focus-head">
        <span className="focus-phase">{focus.paused ? `${focus.label} · paused` : focus.label}</span>
        <span className="focus-rounds" role="img" aria-label={`${done} of ${every} sessions before a long break`}>
          {Array.from({ length: every }, (_, i) => (
            <span key={i} className={i < done ? 'focus-round is-done' : 'focus-round'} />
          ))}
        </span>
      </div>

      <p className="focus-clock" role="timer" aria-label={`${focus.label}: ${spoken(focus.left)} left`}>
        {formatClock(focus.left)}
      </p>
      {/* Announces the phase as it changes, not the seconds. */}
      <p className="visually-hidden" aria-live="polite">
        {focus.paused ? `${focus.label} paused` : focus.label}
      </p>

      <div className="focus-controls">
        {focus.running ? (
          <button type="button" className="focus-primary" onClick={actions.pause} aria-keyshortcuts="F">
            Pause
          </button>
        ) : (
          <button type="button" className="focus-primary" onClick={() => actions.start()} aria-keyshortcuts="F">
            {focus.paused ? 'Resume' : idle ? 'Start focus' : 'Resume'}
          </button>
        )}
        <button type="button" onClick={actions.skip} disabled={idle}>
          {focus.phase === 'work' || idle ? 'Take a break' : 'Skip break'}
        </button>
        <button type="button" onClick={actions.stop} disabled={idle}>
          Stop
        </button>
      </div>

      <div className="focus-field">
        <label htmlFor={`${id}-task`} className="label">
          Working on
        </label>
        <select
          id={`${id}-task`}
          value={task ? String(task.id) : ''}
          onChange={(event) => actions.setTask(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">Nothing in particular</option>
          {openTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.text}
            </option>
          ))}
        </select>
      </div>

      <details className="focus-lengths">
        <summary className="label">Lengths</summary>
        <div className="focus-lengths-grid">
          {LENGTH_FIELDS.map((field) => (
            <label key={field.key} className="focus-length">
              <span>{field.label}</span>
              <span className="focus-length-input">
                <input
                  type="number"
                  min={1}
                  max={field.max}
                  value={focus.lengths[field.key]}
                  onChange={(event) => {
                    const value = Math.round(Number(event.target.value));
                    if (value >= 1 && value <= field.max) actions.setLengths({ [field.key]: value });
                  }}
                />
                {field.unit}
              </span>
            </label>
          ))}
        </div>
        <p className="focus-note">New lengths apply from the next session.</p>
      </details>

      <p className="focus-today">
        <strong>{focus.minutesToday}</strong> min focused today
      </p>
    </div>
  );
}

export default FocusWidget;
