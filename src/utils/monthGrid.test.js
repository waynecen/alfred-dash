import { firstOfMonth, monthWeeks, stepFor } from './monthGrid';

describe('monthGrid', () => {
  it('finds the first of the month', () => {
    expect(firstOfMonth('2026-11-20')).toBe('2026-11-01');
  });

  it('lays a month out as six weeks from the start of the week that holds the 1st', () => {
    // 1 November 2026 is a Sunday.
    const monday = monthWeeks('2026-11-01', 1);
    expect(monday).toHaveLength(6);
    expect(monday.every((week) => week.length === 7)).toBe(true);
    expect(monday[0][0]).toBe('2026-10-26');
    expect(monday[5][6]).toBe('2026-12-06');
    expect(monthWeeks('2026-11-15', 0)[0][0]).toBe('2026-11-01');
  });

  it('moves by a day, a week, a month and to the ends of the week', () => {
    expect(stepFor('ArrowRight', '2026-11-30')).toBe('2026-12-01');
    expect(stepFor('ArrowUp', '2026-11-07')).toBe('2026-10-31');
    expect(stepFor('PageDown', '2027-01-31')).toBe('2027-02-28');
    expect(stepFor('Home', '2026-11-07', 1)).toBe('2026-11-02');
    expect(stepFor('End', '2026-11-07', 0)).toBe('2026-11-07');
    expect(stepFor('Enter', '2026-11-07')).toBeNull();
  });
});
