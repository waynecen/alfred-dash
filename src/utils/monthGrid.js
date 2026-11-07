import { addDays, addMonths, startOfWeek } from './dates';

// What a month grid needs, shared by the Calendar widget and the date picker, so both lay a month
// out and answer the keyboard the same way.

// The first of the month that holds iso: '2026-11-20' gives '2026-11-01'.
export const firstOfMonth = (iso) => `${iso.slice(0, 8)}01`;

// The month as a grid shows it: six weeks of seven days from the start of the week that holds
// the 1st. Always six, so the grid keeps one height from month to month.
//   weekStart: 1 for Monday, 0 for Sunday
export function monthWeeks(month, weekStart = 1) {
  const start = startOfWeek(firstOfMonth(month), weekStart);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

// Where a key moves a month grid's focus from date: a day, a week, a month (Page Up/Down) or the
// ends of the week. null for any other key.
export function stepFor(key, date, weekStart = 1) {
  switch (key) {
    case 'ArrowLeft':
      return addDays(date, -1);
    case 'ArrowRight':
      return addDays(date, 1);
    case 'ArrowUp':
      return addDays(date, -7);
    case 'ArrowDown':
      return addDays(date, 7);
    case 'PageUp':
      return addMonths(date, -1);
    case 'PageDown':
      return addMonths(date, 1);
    case 'Home':
      return startOfWeek(date, weekStart);
    case 'End':
      return addDays(startOfWeek(date, weekStart), 6);
    default:
      return null;
  }
}
