import { useEffect, useId, useRef, useState } from 'react';
import useToday from '../../hooks/useToday';
import useSettings from '../../hooks/useSettings';
import { hourCycle } from '../../data/settings';
import { describeEventTime, eventsOn } from '../../data/events';
import { TASK_DRAG_TYPE } from '../../data/tasks';
import { addDays, addMonths, formatDay, parseISODate, relativeDay, startOfWeek } from '../../utils/dates';
import { plural } from '../../utils/text';
import { firstOfMonth, monthWeeks, stepFor } from '../../utils/monthGrid';
import parseQuickAdd from '../../utils/parseQuickAdd';
import AddLine from '../AddLine/AddLine';
import './CalendarWidget.css';

// What a task being dragged from the Tasks widget carries, so a day can take it.
export { TASK_DRAG_TYPE };


// A month (or a week) of local events, with the tasks due on each day beside them. Pick a day to
// see and add to it; drop a task from the Tasks widget on a day to make it due then.
//   events: [{ id, title, date, start, end }]    tasks: the task list, for due dates
//   onAddEvent({ title, date, start, end })   onDeleteEvent(id)
//   onSetTaskDue(taskId, date)   onToggleTask(taskId)
function CalendarWidget({ events, tasks, onAddEvent, onDeleteEvent, onSetTaskDue, onToggleTask }) {
  const today = useToday();
  const [{ weekStart, timeFormat }] = useSettings();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => firstOfMonth(today));
  const [view, setView] = useState('month');
  const [draft, setDraft] = useState('');
  const [dropDate, setDropDate] = useState(null);
  const cells = useRef(new Map());
  // Set when the keyboard moved the selection, so the new day takes focus.
  const moveFocus = useRef(false);
  const inputId = useId();
  const hour = hourCycle(timeFormat);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    cells.current.get(selected)?.focus();
  }, [selected, month, view]);

  function select(date, { focus = false } = {}) {
    setSelected(date);
    setMonth(firstOfMonth(date));
    moveFocus.current = focus;
  }

  // Open tasks due on each day; done ones only on the day list, struck through.
  const dueOn = (date) => tasks.filter((task) => task.dueDate === date);
  const openDueCount = (date) => dueOn(date).filter((task) => !task.completed).length;

  function describeDay(date) {
    const parts = [formatDay(date, { weekday: 'long', day: 'numeric', month: 'long' })];
    if (date === today) parts.push('today');
    const nEvents = eventsOn(events, date).length;
    const nTasks = openDueCount(date);
    if (nEvents) parts.push(plural(nEvents, 'event'));
    if (nTasks) parts.push(`${plural(nTasks, 'task')} due`);
    return parts.join(', ');
  }

  function handleGridKey(event) {
    const next = stepFor(event.key, selected, weekStart);
    if (!next) return;
    event.preventDefault();
    select(next, { focus: true });
  }

  // A task dragged from the Tasks widget can be dropped on a day.
  const dayDropProps = (date) => ({
    onDragOver: (event) => {
      if (!event.dataTransfer.types.includes(TASK_DRAG_TYPE)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDropDate(date);
    },
    onDragLeave: () => setDropDate((current) => (current === date ? null : current)),
    onDrop: (event) => {
      const id = Number(event.dataTransfer.getData(TASK_DRAG_TYPE));
      setDropDate(null);
      if (!id) return;
      event.preventDefault();
      onSetTaskDue(id, date);
    },
  });

  // "Dentist fri 3pm" is an event on Friday at three; with no day in it, it goes on the day picked.
  const parsed = parseQuickAdd(draft, { times: true, weekStart, now: parseISODate(today) });
  const draftDate = parsed.dueDate ?? selected;

  function handleAdd() {
    onAddEvent({ title: parsed.text, date: draftDate, start: parsed.time, end: parsed.endTime });
    setDraft('');
    if (draftDate !== selected) select(draftDate);
  }

  function renderMark(date) {
    const nEvents = eventsOn(events, date).length;
    const nTasks = openDueCount(date);
    if (!nEvents && !nTasks) return null;
    // Up to three marks: filled squares for events, hollow ones for tasks due.
    const marks = [...Array(Math.min(nEvents, 3)).fill('event'), ...Array(Math.min(nTasks, 3)).fill('task')].slice(0, 3);
    return (
      <span className="calendar-marks" aria-hidden="true">
        {marks.map((kind, index) => (
          <span key={index} className={`calendar-mark calendar-mark-${kind}`} />
        ))}
      </span>
    );
  }

  // In the month grid each day is a gridcell; in the week view it is a plain button in a list.
  function renderDayCell(date, { outside = false, inGrid = true } = {}) {
    const isSelected = date === selected;
    const classes = [
      'calendar-day',
      outside && 'is-outside',
      date === today && 'is-today',
      isSelected && 'is-selected',
      dropDate === date && 'is-drop',
    ].filter(Boolean);
    return (
      <button
        key={date}
        ref={(node) => (node ? cells.current.set(date, node) : cells.current.delete(date))}
        type="button"
        role={inGrid ? 'gridcell' : undefined}
        className={classes.join(' ')}
        tabIndex={isSelected ? 0 : -1}
        aria-selected={inGrid ? isSelected : undefined}
        aria-current={!inGrid && isSelected ? 'date' : undefined}
        aria-label={describeDay(date)}
        onClick={() => select(date)}
        {...(inGrid && dayDropProps(date))}
      >
        <span className="calendar-day-number">{Number(date.slice(8))}</span>
        {renderMark(date)}
      </button>
    );
  }

  function renderMonth() {
    const weeks = monthWeeks(month, weekStart);
    const weekdays = weeks[0];
    return (
      <div
        className="calendar-grid"
        role="grid"
        aria-label={formatDay(month, { month: 'long', year: 'numeric' })}
        onKeyDown={handleGridKey}
      >
        <div role="row" className="calendar-row calendar-weekdays">
          {weekdays.map((date) => (
            <span key={date} role="columnheader" className="calendar-weekday" aria-label={formatDay(date, { weekday: 'long' })}>
              {formatDay(date, { weekday: 'narrow' })}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0]} role="row" className="calendar-row">
            {week.map((date) => renderDayCell(date, { outside: date.slice(0, 7) !== month.slice(0, 7) }))}
          </div>
        ))}
      </div>
    );
  }

  function renderItems(date, { compact = false } = {}) {
    const dayEvents = eventsOn(events, date);
    const dayTasks = dueOn(date);
    if (!dayEvents.length && !dayTasks.length) {
      return compact ? null : <p className="calendar-empty">Nothing planned. Add an event below, or drop a task here.</p>;
    }
    return (
      <ul className="calendar-items">
        {dayEvents.map((event) => (
          <li key={`e${event.id}`} className="calendar-item">
            <span className="calendar-item-time">{describeEventTime(event, hour)}</span>
            <span className="calendar-item-title">{event.title}</span>
            {!compact && (
              <button
                type="button"
                className="calendar-item-delete"
                onClick={() => onDeleteEvent(event.id)}
                aria-label={`Delete event: ${event.title}`}
              >
                ×
              </button>
            )}
          </li>
        ))}
        {dayTasks.map((task) => (
          <li key={`t${task.id}`} className={task.completed ? 'calendar-item is-done' : 'calendar-item'}>
            {compact ? (
              <span className="calendar-item-time">Task</span>
            ) : (
              <span className="calendar-item-time">
                <input
                  type="checkbox"
                  className="calendar-item-check"
                  checked={task.completed}
                  onChange={() => onToggleTask(task.id)}
                  aria-label={`Mark complete: ${task.text}`}
                />
              </span>
            )}
            <span className="calendar-item-title">{task.text}</span>
          </li>
        ))}
      </ul>
    );
  }

  function renderWeek() {
    const start = startOfWeek(selected, weekStart);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return (
      <ol
        className="calendar-week"
        aria-label={`Week of ${formatDay(start, { day: 'numeric', month: 'long' })}`}
        onKeyDown={handleGridKey}
      >
        {days.map((date) => (
          // The whole column takes a dropped task, not just its day number.
          <li key={date} className="calendar-week-day" data-drop={dropDate === date || undefined} {...dayDropProps(date)}>
            <div className="calendar-week-head">
              {renderDayCell(date, { inGrid: false })}
              <span className="calendar-week-name" aria-hidden="true">
                {formatDay(date, { weekday: 'short' })}
              </span>
            </div>
            {renderItems(date, { compact: true })}
          </li>
        ))}
      </ol>
    );
  }

  const step = (n) => {
    if (view === 'week') select(addDays(selected, n * 7));
    else setMonth((current) => addMonths(current, n));
  };
  const heading =
    view === 'week'
      ? `${formatDay(startOfWeek(selected, weekStart), { day: 'numeric', month: 'short' })} – ${formatDay(addDays(startOfWeek(selected, weekStart), 6), { day: 'numeric', month: 'short', year: 'numeric' })}`
      : formatDay(month, { month: 'long', year: 'numeric' });
  // "Today · Sat 7 Nov", or just "Fri 20 Nov" for any other day.
  const near = relativeDay(selected, parseISODate(today));
  const full = formatDay(selected, { weekday: 'short', day: 'numeric', month: 'short' });
  const agendaHeading = ['Today', 'Tomorrow', 'Yesterday'].includes(near) ? `${near} · ${full}` : full;

  return (
    <div className="calendar">
      <div className="calendar-bar">
        <button type="button" className="calendar-nav" onClick={() => step(-1)} aria-label={view === 'week' ? 'Previous week' : 'Previous month'}>
          ‹
        </button>
        <h3 className="calendar-heading" aria-live="polite">
          {heading}
        </h3>
        <button type="button" className="calendar-nav" onClick={() => step(1)} aria-label={view === 'week' ? 'Next week' : 'Next month'}>
          ›
        </button>
        <button type="button" className="calendar-today" onClick={() => select(today)} disabled={selected === today && month === firstOfMonth(today)}>
          Today
        </button>
        <div className="calendar-views" role="group" aria-label="Calendar view">
          {['month', 'week'].map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={view === name}
              className={view === name ? 'active' : ''}
              onClick={() => setView(name)}
            >
              {name === 'month' ? 'Month' : 'Week'}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' ? renderMonth() : renderWeek()}

      <section className="calendar-agenda" aria-labelledby={`${inputId}-day`}>
        <h4 id={`${inputId}-day`} className="calendar-agenda-heading">
          {agendaHeading}
        </h4>
        {view === 'month' && renderItems(selected)}
        <AddLine
          label="Add an event"
          placeholder="Add an event, e.g. “Dentist 3pm” or “Lunch fri noon”"
          value={draft}
          onChange={setDraft}
          onSubmit={handleAdd}
          preview={
            draft.trim() &&
            `${parsed.text} · ${relativeDay(draftDate, parseISODate(today))}${parsed.time ? ` · ${describeEventTime({ start: parsed.time, end: parsed.endTime }, hour)}` : ' · All day'}`
          }
        />
      </section>
    </div>
  );
}

export default CalendarWidget;
