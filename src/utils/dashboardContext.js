import sortTasks from './sortTasks';
import formatCreatedDate from './formatCreatedDate';
import { addDays, formatDay, toISODate } from './dates';
import { habitStreaks } from './streaks';
import { plural } from './text';
import { eventsOn } from '../data/events';
import { describeSchedule, doneOn, habitsDueOn } from '../data/habits';
import { describeProgress, goalProgress, isReached } from '../data/goals';
import { PHASE_LABELS, formatClock } from '../data/focus';

// What the AI widgets tell Claude about the dashboard. Every part is capped, so a big dashboard
// can't make a huge request.

// At most this many tasks go into a prompt, so a long list can't make a huge request.
const MAX_TASKS = 50;

// Open tasks as plain lines for an AI prompt, most important first:
//   - [high] Book flights (due 2026-11-13 Fri) (added 2d ago)
// Returns '' when nothing is open.
export function formatOpenTasks(tasks, today = toISODate()) {
  const open = tasks.filter((task) => !task.completed);
  // Oldest first, then a stable sort by priority, so ties stay oldest first.
  const byAge = sortTasks(open, { key: 'created', direction: 'asc' });
  const sorted = sortTasks(byAge, { key: 'priority', direction: 'desc' });
  const lines = sorted
    .slice(0, MAX_TASKS)
    .map(
      (task) =>
        `- [${task.priority ?? 'medium'}] ${task.text}${dueNote(task, today)} (added ${formatCreatedDate(task.createdAt ?? task.id)})`
    );
  if (open.length > MAX_TASKS) lines.push(`- …and ${open.length - MAX_TASKS} more`);
  return lines.join('\n');
}

// Days are written as the tools take them ('2026-11-13') with the weekday, so Claude can work
// out "Friday" without a calendar.
function day(iso) {
  return `${iso} ${formatDay(iso, { weekday: 'short' })}`;
}

// " (due 2026-11-13 Fri)", or " (due 2026-11-05 Thu, overdue)"; '' with no due date.
function dueNote(task, today) {
  if (!task.dueDate) return '';
  return ` (due ${day(task.dueDate)}${task.dueDate < today ? ', overdue' : ''})`;
}

const MAX_EVENTS = 30;
const MAX_NOTES_CHARS = 1500;
const EVENT_DAYS = 14;

// One open task, with what the assistant's tools need: its id, then its details.
function taskLine(task, indent = '') {
  const parts = [`${indent}- ${task.id}`, task.priority ?? 'medium'];
  if (task.dueDate) parts.push(`due ${day(task.dueDate)}`);
  if (task.tags?.length) parts.push(task.tags.map((tag) => `#${tag}`).join(' '));
  if (task.recurrence) parts.push(`repeats every ${task.recurrence.interval > 1 ? `${task.recurrence.interval} ` : ''}${task.recurrence.every}`);
  return `${parts.join(' · ')} · ${task.text}`;
}

// Open tasks, the ones due soonest first, each with its open steps under it.
function describeTasks(tasks, today) {
  const open = tasks.filter((task) => !task.completed);
  const byDue = (a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.id - b.id;
  // A step whose task is done (or gone) stands on its own.
  const openIds = new Set(open.map((task) => task.id));
  const roots = open.filter((task) => task.parentId == null || !openIds.has(task.parentId));
  const lines = [];
  let shown = 0;
  for (const task of roots.sort(byDue)) {
    if (shown >= MAX_TASKS) break;
    lines.push(taskLine(task));
    shown++;
    for (const step of open.filter((t) => t.parentId === task.id)) {
      lines.push(taskLine(step, '  '));
      shown++;
    }
  }
  if (open.length > shown) lines.push(`(${plural(open.length - shown, 'more open task')} not shown)`);
  const doneToday = tasks.filter((task) => task.completed && task.completedAt && toISODate(task.completedAt) === today);
  return [
    'Open tasks (id · priority · due · tags · text; steps indented under their task):',
    lines.length ? lines.join('\n') : '(none)',
    doneToday.length ? `Done today: ${doneToday.map((task) => task.text).join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function describeEvents(events, today) {
  const until = addDays(today, EVENT_DAYS - 1);
  const lines = [];
  for (let date = today; date <= until && lines.length < MAX_EVENTS; date = addDays(date, 1)) {
    for (const event of eventsOn(events, date)) {
      const when = event.start ? `${event.start}${event.end ? `–${event.end}` : ''}` : 'all day';
      lines.push(`- ${day(date)} ${when} · ${event.title}`);
    }
  }
  return `Events from today to ${until}:\n${lines.length ? lines.slice(0, MAX_EVENTS).join('\n') : '(none)'}`;
}

function describeHabits(habits, habitLog, today) {
  const due = habitsDueOn(habits, today);
  const others = habits.filter((habit) => !habit.archived && !due.includes(habit));
  const lines = due.map((habit) => {
    const { current } = habitStreaks(habit, habitLog[habit.id], today);
    return `- ${habit.id} · ${habit.name} · ${doneOn(habitLog, habit, today) ? 'done today' : 'not done yet'} · ${plural(current, 'day')} in a row`;
  });
  const rest = others.map((habit) => `${habit.name} (id ${habit.id}, ${describeSchedule(habit.schedule)})`);
  return [
    'Habits due today (id · name · today · streak):',
    lines.length ? lines.join('\n') : '(none)',
    rest.length ? `Other habits: ${rest.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function describeGoals(goals, tasks) {
  if (!goals.length) return 'Goals: (none)';
  const lines = goals.map((goal) => {
    const progress = goalProgress(goal, tasks);
    const kind = goal.kind === 'tasks' ? ` (the tasks tagged #${goal.tag})` : '';
    const due = goal.dueDate ? `, by ${day(goal.dueDate)}` : '';
    return `- ${goal.title}: ${describeProgress(goal, progress)}${kind}${due}${isReached(progress) ? ', reached' : ''}`;
  });
  return `Goals:\n${lines.join('\n')}`;
}

function describeFocus(focus, tasks) {
  if (!focus) return '';
  const today = `${focus.minutesToday ?? 0} min focused today`;
  if (focus.phase === 'idle') return `Focus timer: not running; ${today}.`;
  const task = tasks.find((t) => t.id === focus.taskId);
  const on = task ? `, on “${task.text}”` : '';
  return `Focus timer: ${PHASE_LABELS[focus.phase]}${focus.paused ? ' (paused)' : ''}, ${formatClock(focus.left)} left${on}; ${today}.`;
}

function describeNotes(notes) {
  const text = notes?.trim();
  if (!text) return 'Notes: (empty)';
  if (text.length <= MAX_NOTES_CHARS) return `Notes:\n${text}`;
  return `Notes (the first ${MAX_NOTES_CHARS} of ${text.length} characters):\n${text.slice(0, MAX_NOTES_CHARS)}`;
}

// The whole dashboard, as of now, for the assistant: the time, open tasks, the next two weeks of
// events, today's habits, goals, the focus timer and the notes, with the ids its tools need.
//   data: { tasks, events, habits, habitLog, goals, focus, notes }    weekStart: for the header
export function buildDashboardContext({ tasks = [], events = [], habits = [], habitLog = {}, goals = [], focus, notes = '' }, { now = new Date(), weekStart = 1 } = {}) {
  const today = toISODate(now);
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const header = `Now: ${formatDay(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${today}), ${time}. Weeks start on ${weekStart === 0 ? 'Sunday' : 'Monday'}.`;
  const parts = [
    header,
    describeTasks(tasks, today),
    describeEvents(events, today),
    describeHabits(habits, habitLog, today),
    describeGoals(goals, tasks),
    describeFocus(focus, tasks),
    describeNotes(notes),
  ];
  return `<dashboard>\n${parts.filter(Boolean).join('\n\n')}\n</dashboard>`;
}

// Today's events and habits in a few lines, for the Daily Brief.
export function formatToday({ events = [], habits = [], habitLog = {} }, now = new Date()) {
  const today = toISODate(now);
  const schedule = eventsOn(events, today).map((event) => `- ${event.start ? `${event.start}${event.end ? `–${event.end}` : ''}` : 'All day'} ${event.title}`);
  const due = habitsDueOn(habits, today).filter((habit) => !doneOn(habitLog, habit, today));
  return [
    schedule.length ? `Today's events:\n${schedule.join('\n')}` : '',
    due.length ? `Habits still to do today: ${due.map((habit) => habit.name).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}
