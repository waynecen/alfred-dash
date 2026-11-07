import { parseISODate } from '../utils/dates';

// The shape of a habit, saved under the 'habits' key, and the days each one was done, under
// 'habitLog'.
//   id: number, unique (a timestamp, stepped past any taken)
//   name: string
//   schedule: 'daily', or the weekdays it is due on as numbers (0 is Sunday, 6 is Saturday)
//   createdAt: milliseconds
//   archived: hidden from the Habits widget, with its days kept, so it can come back
// habitLog: { [habitId]: ['YYYY-MM-DD', …] }, in date order

export const DAILY = 'daily';

export function createHabit({ name, schedule = DAILY }, id, now) {
  return { id, name, schedule: normalizeSchedule(schedule), createdAt: now, archived: false };
}

// Weekdays in order, without repeats. All seven, or none at all, mean every day.
export function normalizeSchedule(schedule) {
  if (!Array.isArray(schedule)) return DAILY;
  const days = [...new Set(schedule)].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).sort();
  return days.length === 0 || days.length === 7 ? DAILY : days;
}

// The weekdays a schedule is due on, as a list: all seven for 'daily'.
export const scheduleDays = (schedule) => (schedule === DAILY ? [0, 1, 2, 3, 4, 5, 6] : schedule);

// Whether the habit is due on a day ('YYYY-MM-DD').
export const isScheduled = (habit, iso) => habit.schedule === DAILY || habit.schedule.includes(parseISODate(iso).getDay());

// A weekday's name in the user's language: weekdayName(1) is 'Mon'. 7 January 2024 was a Sunday.
export const weekdayName = (day, weekday = 'short') =>
  new Date(2024, 0, 7 + day).toLocaleDateString(undefined, { weekday });

// The weekdays in the order the user's week runs (weekStart: 1 for Monday, 0 for Sunday).
export const weekOrder = (weekStart = 1) => Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);

// How a schedule reads: 'Every day', 'Weekdays', 'Weekends', or its days in week order
// ('Mon, Wed, Fri').
export function describeSchedule(schedule, weekStart = 1) {
  if (schedule === DAILY) return 'Every day';
  const key = schedule.join();
  if (key === '1,2,3,4,5') return 'Weekdays';
  if (key === '0,6') return 'Weekends';
  return weekOrder(weekStart)
    .filter((day) => schedule.includes(day))
    .map((day) => weekdayName(day))
    .join(', ');
}
