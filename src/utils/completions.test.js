import { completedThisWeek, completionsByDay } from './completions';
import { parseISODate } from './dates';

// Noon on a day, as a completedAt timestamp.
const at = (iso) => parseISODate(iso).getTime() + 12 * 3600 * 1000;

const tasks = [
  { completed: true, completedAt: at('2026-11-07') },
  { completed: true, completedAt: at('2026-11-07') },
  { completed: true, completedAt: at('2026-11-02') },
  { completed: true, completedAt: at('2026-10-20') },
  { completed: true, completedAt: null },
  { completed: false, completedAt: null },
];

describe('completionsByDay', () => {
  it('counts the last seven days, oldest first, ending today', () => {
    const days = completionsByDay(tasks, '2026-11-07');
    expect(days.map((day) => day.date)).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
    ]);
    expect(days.map((day) => day.count)).toEqual([0, 1, 0, 0, 0, 0, 2]);
  });
});

describe('completedThisWeek', () => {
  it('counts from Monday by default, or from Sunday', () => {
    // 7 Nov 2026 is a Saturday: the week began on Monday 2 Nov, or on Sunday 1 Nov.
    expect(completedThisWeek(tasks, '2026-11-07')).toBe(3);
    expect(completedThisWeek(tasks, '2026-11-07', 0)).toBe(3);
    expect(completedThisWeek(tasks, '2026-11-01', 1)).toBe(0);
  });
});
