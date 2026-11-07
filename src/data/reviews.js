import { addDays, startOfWeek, toISODate } from '../utils/dates';
import { rangeTally } from '../utils/streaks';
import { goalProgress, isReached } from './goals';

// The shape of a saved weekly review, under the 'reviews' key (newest last).
//   week: 'YYYY-MM-DD', the first day of the week it looked back on
//   notes: what the person wrote    reflection: Claude's reflection, if asked for ('' if not)
//   stats: { tasksDone, overdue, habitsDue, habitsDone, focusMinutes, goals, goalsReached }
//   savedAt: milliseconds

// The week a review looks back on: on the first day of a week, the week that has just ended;
// on any other day, this week so far.
//   returns { from, to }, both 'YYYY-MM-DD' and included
export function reviewWeek(today, weekStart = 1) {
  const start = startOfWeek(today, weekStart);
  if (start === today) {
    const from = startOfWeek(addDays(today, -1), weekStart);
    return { from, to: addDays(from, 6) };
  }
  return { from: start, to: today };
}

// Whether a weekly review has been saved for the week starting on `from`.
export const isReviewed = (reviews, from) => reviews.some((review) => review.week === from);

const within = (iso, { from, to }) => iso >= from && iso <= to;

// The tasks ticked off in the week, the most recent first.
export function tasksDoneIn(tasks, week) {
  return tasks
    .filter((task) => task.completed && task.completedAt && within(toISODate(task.completedAt), week))
    .sort((a, b) => b.completedAt - a.completedAt);
}

// The open tasks due before today.
export const overdueTasks = (tasks, today) => tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < today);

// Focus minutes on each of the week's seven days: [{ date, count }], from its first day.
export function focusByDay(sessions, week) {
  const minutes = new Map();
  for (const session of sessions) {
    const day = toISODate(session.startedAt);
    minutes.set(day, (minutes.get(day) ?? 0) + session.minutes);
  }
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(week.from, i);
    return { date, count: minutes.get(date) ?? 0 };
  });
}

// The task worked on longest in the week, from the focus log: { taskId, minutes } or null.
export function topFocusTask(sessions, week) {
  const minutes = new Map();
  for (const session of sessions) {
    if (session.taskId == null || !within(toISODate(session.startedAt), week)) continue;
    minutes.set(session.taskId, (minutes.get(session.taskId) ?? 0) + session.minutes);
  }
  let top = null;
  for (const [taskId, total] of minutes) if (!top || total > top.minutes) top = { taskId, minutes: total };
  return top;
}

// Each habit kept over the week: [{ habit, due, done }], for the habits not archived.
export function habitsIn(habits, habitLog, week) {
  return habits
    .filter((habit) => !habit.archived)
    .map((habit) => ({ habit, ...rangeTally(habit, habitLog[habit.id] ?? [], week.from, week.to) }));
}

// The week in numbers, kept with the review.
export function reviewStats({ tasks, habits, habitLog, sessions, goals, week, today }) {
  const kept = habitsIn(habits, habitLog, week);
  return {
    tasksDone: tasksDoneIn(tasks, week).length,
    overdue: overdueTasks(tasks, today).length,
    habitsDue: kept.reduce((sum, row) => sum + row.due, 0),
    habitsDone: kept.reduce((sum, row) => sum + row.done, 0),
    focusMinutes: focusByDay(sessions, week).reduce((sum, day) => sum + day.count, 0),
    goals: goals.length,
    goalsReached: goals.filter((goal) => isReached(goalProgress(goal, tasks))).length,
  };
}
