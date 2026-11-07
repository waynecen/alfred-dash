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
