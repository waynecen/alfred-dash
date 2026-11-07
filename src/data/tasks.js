import { addDays, addMonths, relativeDay, parseISODate } from '../utils/dates';

// The shape of a task. Every field after `createdAt` arrived in schema version 2.
//   id: number, unique (a timestamp, stepped past any taken)
//   text: string
//   priority: 'low' | 'medium' | 'high'
//   completed: boolean
//   createdAt: milliseconds
//   completedAt: milliseconds | null, when it was last ticked off
//   dueDate: 'YYYY-MM-DD' | null, a calendar day in local time (see utils/dates.js)
//   tags: string[], lower case without the '#'
//   parentId: number | null, the task this is a step of
//   recurrence: null | { every: 'day' | 'week' | 'month', interval: number }
//   notes: string
export const PRIORITIES = ['low', 'medium', 'high'];

const DEFAULTS = {
  priority: 'medium',
  completed: false,
  completedAt: null,
  dueDate: null,
  tags: [],
  parentId: null,
  recurrence: null,
  notes: '',
};

// How a repeat reads: "Every day", "Every 2 weeks".
export function describeRecurrence(recurrence) {
  if (!recurrence) return '';
  const { every, interval = 1 } = recurrence;
  return interval === 1 ? `Every ${every}` : `Every ${interval} ${every}s`;
}

// A new task from what the user (or the AI) gave: fields is at least { text }.
export function createTask(fields, id, now) {
  return { ...DEFAULTS, ...fields, id, createdAt: now };
}

// Fills in anything a task saved by an older version is missing, keeping what it has.
// Tasks saved before createdAt existed use their id, which is a timestamp too.
export function normalizeTask(task) {
  return {
    ...DEFAULTS,
    ...task,
    priority: PRIORITIES.includes(task.priority) ? task.priority : DEFAULTS.priority,
    completed: Boolean(task.completed),
    createdAt: task.createdAt ?? task.id,
    tags: Array.isArray(task.tags) ? task.tags : [],
  };
}

// Tags typed as a list, "#home, Work errands" -> ['home', 'work', 'errands']: the same rules as
// quick-add (letters, digits, _ and -, lower case, no repeats).
export function parseTags(text) {
  const tags = [];
  for (const word of text.split(/[\s,]+/)) {
    const name = word.replace(/^#+/, '').toLowerCase();
    if (/^[\p{L}\p{N}_-]+$/u.test(name) && !tags.includes(name)) tags.push(name);
  }
  return tags;
}

// When a repeating task comes round again: the first repeat of its due date (or of today, if it
// has none) that falls after today. Counting whole steps from the same start keeps a monthly task
// on its day: the 31st becomes the last day of a short month, then the 31st again after it.
export function nextOccurrence(recurrence, dueDate, today) {
  const { every, interval = 1 } = recurrence;
  const start = dueDate ?? today;
  const step = (k) =>
    every === 'month' ? addMonths(start, k * interval) : addDays(start, k * interval * (every === 'week' ? 7 : 1));
  let k = 1;
  while (step(k) <= today) k++;
  return step(k);
}

// The task that replaces a repeating one when it is done: the same task, due next time.
export function nextTaskFields(task, today) {
  const { text, priority, tags, recurrence, notes, parentId } = task;
  return { text, priority, tags, recurrence, notes, parentId, dueDate: nextOccurrence(recurrence, task.dueDate, today) };
}

// "Fri 13 Nov", or "Tomorrow": how the toast names the next due day.
export function describeNext(iso, today) {
  const near = relativeDay(iso, parseISODate(today));
  const full = parseISODate(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return near === 'Today' || near === 'Tomorrow' ? near : full;
}
