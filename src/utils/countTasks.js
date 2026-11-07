import { toISODate } from './dates';
import { matchesWhen } from './filterTasks';

// How many tasks are still open and how many are done, plus how many open tasks
// there are at each priority, e.g. { active: 3, completed: 1, openByPriority: { high: 2, medium: 1, low: 0 } }.
function countTasks(tasks) {
  const open = tasks.filter((task) => !task.completed);
  const openByPriority = { high: 0, medium: 0, low: 0 };

  for (const task of open) {
    // Tasks saved before priorities existed have none, so they count as medium.
    const priority = task.priority in openByPriority ? task.priority : 'medium';
    openByPriority[priority] += 1;
  }

  return {
    active: open.length,
    completed: tasks.length - open.length,
    openByPriority,
  };
}

// Open tasks by when they are due: { overdue, today, upcoming }. Done tasks need no attention,
// so they are left out.
export function countDue(tasks, today = toISODate()) {
  const open = tasks.filter((task) => !task.completed);
  const count = (when) => open.filter((task) => matchesWhen(task, when, today)).length;
  return { overdue: count('overdue'), today: count('today'), upcoming: count('upcoming') };
}

// Every tag in use, most used first (then A to Z): [{ tag: 'home', count: 3 }].
export function countTags(tasks) {
  const counts = new Map();
  for (const task of tasks) {
    for (const tag of task.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export default countTasks;
