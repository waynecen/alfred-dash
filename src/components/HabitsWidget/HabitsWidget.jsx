import { useEffect, useId, useRef, useState } from 'react';
import useToday from '../../hooks/useToday';
import useSettings from '../../hooks/useSettings';
import WeekdayPicker from '../WeekdayPicker/WeekdayPicker';
import AddLine from '../AddLine/AddLine';
import EditorActions from '../EditorActions/EditorActions';
import WidgetState from '../WidgetState/WidgetState';
import HabitHeatmap from './HabitHeatmap';
import { DAILY, describeSchedule, isScheduled } from '../../data/habits';
import { dayTally, habitStreaks } from '../../utils/streaks';
import { addDays, formatDay, toISODate } from '../../utils/dates';
import './HabitsWidget.css';

// The habits, each with the last seven days to tick off and its streak, then a line to add one.
// On a wide widget the last twelve weeks show under them as a heatmap.
//   habits: [{ id, name, schedule, createdAt, archived }]    log: { [habitId]: days done }
//   actions: { addHabit, updateHabit, toggleHabitDay, archiveHabit, deleteHabit }
function HabitsWidget({ habits, log, actions }) {
  const today = useToday();
  const [{ weekStart }] = useSettings();
  const active = habits.filter((habit) => !habit.archived);
  const archived = habits.filter((habit) => habit.archived);
  // Oldest on the left, today on the right, as the days are read.
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const tally = dayTally(active, log, today);

  return (
    <div className="habits">
      {active.length ? (
        <>
          <p className="habits-summary">
            {tally.due ? `${tally.done} of ${tally.due} done today` : 'Nothing due today'}
          </p>
          <table className="habits-table">
            <caption className="visually-hidden">Habits over the last 7 days</caption>
            <thead>
              <tr>
                <th scope="col" className="habits-col-name">
                  Habit
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className={day === today ? 'habits-col-day is-today' : 'habits-col-day'}
                    aria-label={day === today ? 'Today' : formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}
                  >
                    {formatDay(day, { weekday: 'narrow' })}
                  </th>
                ))}
                <th scope="col" className="habits-col-streak">
                  Streak
                </th>
              </tr>
            </thead>
            <tbody>
              {active.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  done={log[habit.id] ?? []}
                  days={days}
                  today={today}
                  weekStart={weekStart}
                  actions={actions}
                />
              ))}
            </tbody>
          </table>
          <HabitHeatmap habits={active} log={log} today={today} weekStart={weekStart} />
        </>
      ) : (
        <WidgetState status="empty" message="Add a habit to keep: something to do every day, or on the days you choose." />
      )}
      <AddHabit onAdd={actions.addHabit} weekStart={weekStart} />
      {archived.length > 0 && <ArchivedHabits habits={archived} actions={actions} />}
    </div>
  );
}

// One habit: its name, a box for each of the last seven days, and its streak. The left and right
// arrow keys move along the boxes; Space or Enter ticks one.
function HabitRow({ habit, done, days, today, weekStart, actions }) {
  const [editing, setEditing] = useState(false);
  const cells = useRef([]);
  const editButton = useRef(null);
  const wasEditing = useRef(false);
  const { current, best } = habitStreaks(habit, done, today);
  const made = toISODate(habit.createdAt);

  // Back from the editor, focus returns to the button that opened it.
  useEffect(() => {
    if (wasEditing.current && !editing) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  if (editing) {
    return (
      <tr className="habit-row is-editing">
        <td colSpan={days.length + 2}>
          <HabitEditor
            habit={habit}
            weekStart={weekStart}
            onSave={(fields) => {
              actions.updateHabit(habit.id, fields);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
            onArchive={() => actions.archiveHabit(habit.id)}
            onDelete={() => actions.deleteHabit(habit.id)}
          />
        </td>
      </tr>
    );
  }

  function handleKeyDown(event, index) {
    const next = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: days.length - 1 }[event.key];
    if (next === undefined || next < 0 || next >= days.length) return;
    event.preventDefault();
    cells.current[next]?.focus();
  }

  return (
    <tr className="habit-row">
      <th scope="row" className="habit-name">
        {/* The name opens the editor, as a task's text does. */}
        <button ref={editButton} type="button" className="habit-name-button" onClick={() => setEditing(true)} title="Edit habit">
          {habit.name}
        </button>
        {habit.schedule !== DAILY && <span className="habit-schedule">{describeSchedule(habit.schedule, weekStart)}</span>}
      </th>
      {days.map((day, index) => {
        const isDone = done.includes(day);
        const due = isScheduled(habit, day) && day >= made;
        let state = 'is-rest';
        if (isDone) state = 'is-done';
        else if (due) state = day === today ? 'is-due' : 'is-missed';
        return (
          <td key={day} className={day === today ? 'habit-day is-today' : 'habit-day'}>
            <button
              ref={(node) => (cells.current[index] = node)}
              type="button"
              className={`habit-check ${state}`}
              aria-pressed={isDone}
              aria-label={`${habit.name}, ${day === today ? 'today' : formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}${due ? '' : ', not due'}`}
              tabIndex={day === today ? 0 : -1}
              onClick={() => actions.toggleHabitDay(habit.id, day)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            />
          </td>
        );
      })}
      <td className="habit-streak">
        <strong>{current}</strong>
        <span className="visually-hidden"> in a row,</span>
        <span className="habit-best">Best {best}</span>
      </td>
    </tr>
  );
}

// Renames a habit, changes its days, or puts it away. Escape leaves it as it was.
function HabitEditor({ habit, weekStart, onSave, onCancel, onArchive, onDelete }) {
  const [name, setName] = useState(habit.name);
  const [schedule, setSchedule] = useState(habit.schedule);
  const id = useId();

  function handleSubmit(event) {
    event.preventDefault();
    onSave({ name: name.trim() || habit.name, schedule });
  }

  return (
    <form
      className="habit-editor"
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onCancel();
      }}
    >
      <label htmlFor={id} className="visually-hidden">
        Habit name
      </label>
      <input id={id} type="text" value={name} onChange={(event) => setName(event.target.value)} autoFocus autoComplete="off" />
      <WeekdayPicker value={schedule} onChange={setSchedule} weekStart={weekStart} />
      <EditorActions onCancel={onCancel}>
        <button type="button" className="editor-quiet" onClick={onArchive}>
          Archive
        </button>
        <button type="button" className="editor-quiet editor-danger" onClick={onDelete}>
          Delete
        </button>
      </EditorActions>
    </form>
  );
}

// A line to name a new habit; once something is typed, the days it is due can be picked too.
function AddHabit({ onAdd, weekStart }) {
  const [draft, setDraft] = useState('');
  const [schedule, setSchedule] = useState(DAILY);

  function handleSubmit() {
    onAdd({ name: draft.trim(), schedule });
    setDraft('');
    setSchedule(DAILY);
  }

  return (
    <AddLine label="New habit" placeholder="New habit, e.g. “Read 20 minutes”" value={draft} onChange={setDraft} onSubmit={handleSubmit}>
      {draft.trim() && <WeekdayPicker value={schedule} onChange={setSchedule} weekStart={weekStart} label="Days the new habit is due" />}
    </AddLine>
  );
}

// Habits put away, kept with their days, to bring back or delete for good.
function ArchivedHabits({ habits, actions }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="habits-archived">
      <button type="button" className="habits-archived-toggle" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>
        Archived ({habits.length})
      </button>
      {open && (
        <ul id={id} className="habits-archived-list">
          {habits.map((habit) => (
            <li key={habit.id}>
              <span>{habit.name}</span>
              <button type="button" onClick={() => actions.archiveHabit(habit.id, false)} aria-label={`Restore habit: ${habit.name}`}>
                Restore
              </button>
              <button type="button" className="editor-danger" onClick={() => actions.deleteHabit(habit.id)} aria-label={`Delete habit: ${habit.name}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default HabitsWidget;
