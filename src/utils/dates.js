// Calendar days as 'YYYY-MM-DD' strings in local time: what due dates, events and habit logs
// store. Strings in this form sort and compare in date order ('2026-11-07' < '2026-11-10'), and
// unlike a timestamp they mean the same day wherever the user travels.

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');

// The local calendar day of a Date (or timestamp), e.g. '2026-11-07'.
export function toISODate(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Local midnight at the start of the day. (new Date('2026-11-07') would be midnight UTC.)
export function parseISODate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isISODate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toISODate(parseISODate(value)) === value;
}

// The day n days later (or earlier, for negative n). Works on calendar days, so a daylight
// saving change never skips or repeats one.
export function addDays(iso, n) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + n);
  return toISODate(date);
}

// The same day n months later. A day the month doesn't have becomes its last day
// (31 January plus one month is 28 or 29 February).
export function addMonths(iso, n) {
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(year, month - 1 + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toISODate(target);
}

// A day written out in the user's language: formatDay('2026-11-13', { weekday: 'short' }) is
// 'Fri'. options are toLocaleDateString's.
export const formatDay = (iso, options) => parseISODate(iso).toLocaleDateString(undefined, options);

// Whole days from a to b: daysBetween('2026-11-07', '2026-11-10') is 3.
export function daysBetween(a, b) {
  // Noon avoids an hour lost or gained to daylight saving rounding the wrong way.
  const noon = (iso) => parseISODate(iso).getTime() + DAY_MS / 2;
  return Math.round((noon(b) - noon(a)) / DAY_MS);
}

export const isToday = (iso, now = new Date()) => iso === toISODate(now);

// Due before today. Today itself is not overdue.
export const isOverdue = (iso, now = new Date()) => Boolean(iso) && iso < toISODate(now);

// The first day of the week that contains iso. weekStart is 1 for Monday, 0 for Sunday.
export function startOfWeek(iso, weekStart = 1) {
  const day = parseISODate(iso).getDay(); // 0 is Sunday
  return addDays(iso, -((day - weekStart + 7) % 7));
}

// The first day of the week after the one that holds iso: what "next week" means.
export const startOfNextWeek = (iso, weekStart = 1) => addDays(startOfWeek(iso, weekStart), 7);

// A short, human label for a day, as seen from now:
// 'Today', 'Tomorrow', 'Yesterday', a weekday within the next week ('Fri'), otherwise a date
// ('13 Nov', with the year only when it isn't this year).
export function relativeDay(iso, now = new Date()) {
  const diff = daysBetween(toISODate(now), iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const date = parseISODate(iso);
  if (diff > 1 && diff < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== new Date(now).getFullYear() && { year: 'numeric' }),
  });
}
