const PRIORITY_RANK = { low: 0, medium: 1, high: 2 };

// How to compare two tasks for each sortable column. Each returns a negative number,
// zero, or a positive number, like the function Array.sort expects.
const COMPARERS = {
  description: (a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }),
  // Tasks saved before priorities existed have none, so they count as medium.
  priority: (a, b) =>
    PRIORITY_RANK[a.priority ?? 'medium'] - PRIORITY_RANK[b.priority ?? 'medium'],
  // Tasks saved before createdAt existed use their id, which is a timestamp too.
  created: (a, b) => (a.createdAt ?? a.id) - (b.createdAt ?? b.id),
  // 'YYYY-MM-DD' strings compare in date order.
  due: (a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0),
};

// Columns where some tasks have no value. Those tasks go last in both directions, so flipping
// the sort shows the latest due date first, not a block of undated tasks.
const HAS_VALUE = {
  due: (task) => Boolean(task.dueDate),
};

// Returns a sorted copy. sort looks like { key: 'priority', direction: 'asc' | 'desc' },
// or null to keep the order the tasks were added in.
// Ascending means A to Z, low to high, oldest to newest, soonest due to latest.
function sortTasks(tasks, sort) {
  if (!sort) return tasks;
  const compare = COMPARERS[sort.key];
  const hasValue = HAS_VALUE[sort.key];
  const sign = sort.direction === 'desc' ? -1 : 1;
  // Array.sort is stable, so tasks that tie keep their original order.
  return [...tasks].sort((a, b) => {
    if (hasValue) {
      const missing = Number(!hasValue(a)) - Number(!hasValue(b));
      if (missing !== 0 || !hasValue(a)) return missing;
    }
    return sign * compare(a, b);
  });
}

export default sortTasks;
