import { addDays, startOfWeek, toISODate } from './dates';

// How many tasks were ticked off on each of the last `days` days, oldest first, ending today:
// [{ date: 'YYYY-MM-DD', count }]. A task counts on the day of its completedAt, in local time.
// Tasks done before completedAt was recorded have none, so they don't count.
export function completionsByDay(tasks, today = toISODate(), days = 7) {
  const counts = new Map();
  for (const task of tasks) {
    if (!task.completed || !task.completedAt) continue;
    const day = toISODate(task.completedAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1));
    return { date, count: counts.get(date) ?? 0 };
  });
}

// Tasks ticked off since the week began (weekStart: 1 for Monday, 0 for Sunday).
export function completedThisWeek(tasks, today = toISODate(), weekStart = 1) {
  const from = startOfWeek(today, weekStart);
  return tasks.filter((task) => {
    if (!task.completed || !task.completedAt) return false;
    const day = toISODate(task.completedAt);
    return day >= from && day <= today;
  }).length;
}
