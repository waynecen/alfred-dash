import { addDays, toISODate } from './dates';
import { isScheduled } from '../data/habits';

// Streaks count the days a habit is due. Doing it on a due day adds one; missing a due day ends
// the streak. A day it isn't due is passed over, so a rest day never breaks a streak (and doing
// it anyway still adds one). Today is still to come until it is done, so it never breaks one
// either.
//   habit: { schedule, createdAt }    done: the days it was done, 'YYYY-MM-DD', in any order
// Returns { current, best }.
export function habitStreaks(habit, done = [], today = toISODate()) {
  const doneDays = new Set(done);
  const created = toISODate(habit.createdAt);
  // From the day it was made, or the first day it was done, if that was earlier (filled in later).
  const first = [...doneDays].reduce((earliest, day) => (day < earliest ? day : earliest), created);
  let run = 0;
  let best = 0;
  for (let day = first; day <= today; day = addDays(day, 1)) {
    if (doneDays.has(day)) {
      run += 1;
      best = Math.max(best, run);
    } else if (day !== today && isScheduled(habit, day)) {
      run = 0;
    }
  }
  return { current: run, best };
}

// Whether a habit was around on a day: made by then, or done then (a day filled in before it
// was made counts).
const existed = (habit, done, date) => toISODate(habit.createdAt) <= date || done.includes(date);

// How one day went across habits: how many were due, and how many of those were done.
//   habits: the habits to count (archived ones are usually left out first)
//   log: { [habitId]: days done }
export function dayTally(habits, log, date) {
  let due = 0;
  let done = 0;
  for (const habit of habits) {
    const days = log[habit.id] ?? [];
    if (!existed(habit, days, date) || !isScheduled(habit, date)) continue;
    due += 1;
    if (days.includes(date)) done += 1;
  }
  return { due, done };
}

// The same for one habit over a run of days, from and to included: { due, done }.
export function rangeTally(habit, done = [], from, to) {
  let due = 0;
  let hit = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (!existed(habit, done, day) || !isScheduled(habit, day)) continue;
    due += 1;
    if (done.includes(day)) hit += 1;
  }
  return { due, done: hit };
}
