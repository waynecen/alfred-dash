import sortTasks from './sortTasks';
import formatCreatedDate from './formatCreatedDate';

// At most this many tasks go into a prompt, so a long list can't make a huge request.
const MAX_TASKS = 50;

// Open tasks as plain lines for an AI prompt, most important first:
//   - [high] Book flights (added 2d ago)
// Returns '' when nothing is open.
export function formatOpenTasks(tasks) {
  const open = tasks.filter((task) => !task.completed);
  // Oldest first, then a stable sort by priority, so ties stay oldest first.
  const byAge = sortTasks(open, { key: 'created', direction: 'asc' });
  const sorted = sortTasks(byAge, { key: 'priority', direction: 'desc' });
  const lines = sorted
    .slice(0, MAX_TASKS)
    .map(
      (task) =>
        `- [${task.priority ?? 'medium'}] ${task.text} (added ${formatCreatedDate(task.createdAt ?? task.id)})`
    );
  if (open.length > MAX_TASKS) lines.push(`- …and ${open.length - MAX_TASKS} more`);
  return lines.join('\n');
}
