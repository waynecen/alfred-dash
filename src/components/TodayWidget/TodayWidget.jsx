import { useEffect, useId, useState } from 'react';
import useToday from '../../hooks/useToday';
import useSettings from '../../hooks/useSettings';
import { hourCycle } from '../../data/settings';
import { describeEventTime, eventsOn } from '../../data/events';
import { formatClock } from '../../data/focus';
import { doneOn, habitsDueOn } from '../../data/habits';
import { habitStreaks } from '../../utils/streaks';
import { parseISODate, relativeDay } from '../../utils/dates';
import parseQuickAdd from '../../utils/parseQuickAdd';
import { plural } from '../../utils/text';
import AddLine from '../AddLine/AddLine';
import './TodayWidget.css';

// The clock time now, as 'HH:MM', updated each minute, to tell past events from coming ones.
function useClockTime() {
  const read = () => new Date().toTimeString().slice(0, 5);
  const [time, setTime] = useState(read);
  useEffect(() => {
    const timer = setInterval(() => setTime(read()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

// What a typed line will become: an event if it has a time in it, otherwise a task. Either way
// it is for today unless the line names another day.
function readLine(text, today, weekStart) {
  const parsed = parseQuickAdd(text, { times: true, weekStart, now: parseISODate(today) });
  if (parsed.time) return { kind: 'event', parsed, date: parsed.dueDate ?? today };
  // Read again without times, so a task keeps any number that isn't a time.
  const task = parseQuickAdd(text, { weekStart, now: parseISODate(today) });
  return { kind: 'task', parsed: task, date: task.dueDate ?? today };
}

// The Today widget: one column of everything that matters today. The day's events, what is due
// or overdue, the habits to tick off, the focus timer, and one line to add a task or an event.
//   tasks, events, focus, habits, habitLog: shared dashboard data
//   actions: { toggleTask, addTask, addEvent, toggleHabitDay, focusTimer }
function TodayWidget({ tasks, events, focus, habits = [], habitLog = {}, actions }) {
  const today = useToday();
  const now = useClockTime();
  const [{ weekStart, timeFormat }] = useSettings();
  const [draft, setDraft] = useState('');
  const id = useId();
  const hour = hourCycle(timeFormat);

  const schedule = eventsOn(events, today);
  // The next event still to come (or under way), marked so the eye lands on it.
  const next = schedule.find((event) => event.start && (event.end ?? event.start) >= now);
  const overdue = tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < today);
  const dueToday = tasks.filter((task) => task.dueDate === today);
  const openToday = dueToday.filter((task) => !task.completed).length;
  // The habits due today (made by today), and those still to tick off.
  const keptHabits = habits.filter((habit) => !habit.archived);
  const habitsToday = habitsDueOn(habits, today);
  const habitDone = (habit) => doneOn(habitLog, habit, today);
  const habitsLeft = habitsToday.filter((habit) => !habitDone(habit)).length;

  const line = draft.trim() ? readLine(draft, today, weekStart) : null;

  function handleAdd() {
    const { kind, parsed, date } = line;
    if (kind === 'event') {
      actions.addEvent({ title: parsed.text, date, start: parsed.time, end: parsed.endTime });
    } else {
      actions.addTask(parsed.text, parsed.priority ?? 'medium', { dueDate: date, tags: parsed.tags, recurrence: parsed.recurrence });
    }
    actions.notify?.({ message: `Added ${kind === 'event' ? 'event' : 'task'} “${parsed.text}”` });
    setDraft('');
  }

  const date = parseISODate(today);
  const summary = [
    schedule.length ? plural(schedule.length, 'event') : null,
    openToday ? `${openToday} due` : null,
    overdue.length ? `${overdue.length} overdue` : null,
    habitsLeft ? `${plural(habitsLeft, 'habit')} to go` : null,
  ].filter(Boolean);

  const renderTask = (task, late) => (
    <li key={task.id} className={task.completed ? 'today-item is-done' : 'today-item'}>
      <span className="today-item-when">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => actions.toggleTask(task.id)}
          aria-label={`Mark complete: ${task.text}`}
        />
      </span>
      <span className="today-item-title">{task.text}</span>
      {late && <span className="today-item-tag">{relativeDay(task.dueDate, date)}</span>}
    </li>
  );

  return (
    <div className="today">
      <header className="today-head">
        <p className="today-date">
          <span className="today-weekday label">{date.toLocaleDateString(undefined, { weekday: 'long' })}</span>
          {date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
        </p>
        <p className="today-summary">{summary.length ? summary.join(' · ') : 'Nothing scheduled'}</p>
      </header>

      <section className="today-section" aria-labelledby={`${id}-schedule`}>
        <h4 className="label" id={`${id}-schedule`}>Schedule</h4>
        {schedule.length ? (
          <ul className="today-list">
            {schedule.map((event) => {
              const past = event.start && (event.end ?? event.start) < now;
              const classes = ['today-item', past && 'is-past', event === next && 'is-next'].filter(Boolean).join(' ');
              return (
                <li key={event.id} className={classes}>
                  <span className="today-item-when">{describeEventTime(event, hour)}</span>
                  <span className="today-item-title">{event.title}</span>
                  {event === next && <span className="today-item-tag">Next</span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="today-empty">No events today.</p>
        )}
      </section>

      <section className="today-section" aria-labelledby={`${id}-due`}>
        <h4 className="label" id={`${id}-due`}>Due</h4>
        {overdue.length || dueToday.length ? (
          <ul className="today-list">
            {overdue.map((task) => renderTask(task, true))}
            {dueToday.map((task) => renderTask(task, false))}
          </ul>
        ) : (
          <p className="today-empty">Nothing due today.</p>
        )}
      </section>

      {keptHabits.length > 0 && (
        <section className="today-section" aria-labelledby={`${id}-habits`}>
          <h4 className="label" id={`${id}-habits`}>Habits</h4>
          {habitsToday.length ? (
            <ul className="today-list">
              {habitsToday.map((habit) => {
                const done = habitDone(habit);
                const { current } = habitStreaks(habit, habitLog[habit.id], today);
                return (
                  <li key={habit.id} className={done ? 'today-item is-done' : 'today-item'}>
                    <span className="today-item-when">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => actions.toggleHabitDay(habit.id, today)}
                        aria-label={`Done today: ${habit.name}`}
                      />
                    </span>
                    <span className="today-item-title">{habit.name}</span>
                    {current > 1 && <span className="today-item-tag">{current} in a row</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="today-empty">No habits due today.</p>
          )}
        </section>
      )}

      {focus && (
        <section className="today-section today-focus" aria-labelledby={`${id}-focus`}>
          <h4 className="label" id={`${id}-focus`}>Focus</h4>
          <p className="today-focus-line">
            {focus.phase === 'idle' ? (
              <span>
                <strong>{focus.minutesToday}</strong> min so far
              </span>
            ) : (
              <span>
                <strong className="today-focus-clock">{formatClock(focus.left)}</strong> {focus.label.toLowerCase()}
                {focus.paused ? ', paused' : ''}
              </span>
            )}
            <button type="button" onClick={actions.focusTimer.toggle} aria-keyshortcuts="F">
              {focus.running ? 'Pause' : focus.paused || focus.phase !== 'idle' ? 'Resume' : 'Start focus'}
            </button>
          </p>
        </section>
      )}

      <AddLine
        className="today-add"
        label="Add a task or an event"
        placeholder="Add for today: “Call bank” or “Lunch 1pm”"
        value={draft}
        onChange={setDraft}
        onSubmit={handleAdd}
        canAdd={Boolean(line)}
        preview={
          line
            ? `${line.kind === 'event' ? 'Event' : 'Task'} · ${relativeDay(line.date, date)}${
                line.kind === 'event' ? ` · ${describeEventTime({ start: line.parsed.time, end: line.parsed.endTime }, hour)}` : ''
              }`
            : ''
        }
      />
    </div>
  );
}

export default TodayWidget;
