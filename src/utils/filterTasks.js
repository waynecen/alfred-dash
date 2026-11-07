import { toISODate } from './dates';

// Which tasks to show. Every part is optional, and the parts combine:
//   status: 'all' | 'active' | 'completed'
//   when: 'any' | 'overdue' | 'today' | 'upcoming' | 'nodate', by due date
//         (overdue only counts open tasks: a done task is never late)
//   tag: a tag without the '#', or '' for any
//   query: words to find in the text, notes or tags, ignoring case
// today: 'YYYY-MM-DD', the day "today" and "overdue" are measured from.
function filterTasks(tasks, { status = 'all', when = 'any', tag = '', query = '' }, today = toISODate()) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return tasks.filter(
    (task) =>
      matchesStatus(task, status) &&
      matchesWhen(task, when, today) &&
      (!tag || (task.tags ?? []).includes(tag)) &&
      matchesWords(task, words)
  );
}

function matchesStatus(task, status) {
  if (status === 'active') return !task.completed;
  if (status === 'completed') return task.completed;
  return true; // 'all'
}

export function matchesWhen(task, when, today) {
  const due = task.dueDate;
  if (when === 'overdue') return Boolean(due) && due < today && !task.completed;
  if (when === 'today') return due === today;
  if (when === 'upcoming') return Boolean(due) && due > today;
  if (when === 'nodate') return !due;
  return true; // 'any'
}

// Every word must appear somewhere, so "rent home" finds "Pay rent #home".
function matchesWords(task, words) {
  if (words.length === 0) return true;
  const haystack = [task.text, task.notes ?? '', ...(task.tags ?? []).map((tag) => `#${tag}`)]
    .join(' ')
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

export default filterTasks;
