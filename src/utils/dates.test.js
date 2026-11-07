import { toISODate, parseISODate, isISODate, addDays, daysBetween, isOverdue, startOfWeek, relativeDay } from './dates';

// Saturday 7 November 2026, mid-morning local time.
const NOW = new Date(2026, 10, 7, 10, 30);

describe('dates', () => {
  it('uses the local calendar day, not UTC', () => {
    expect(toISODate(new Date(2026, 10, 7, 23, 59))).toBe('2026-11-07');
    expect(parseISODate('2026-11-07').getHours()).toBe(0);
  });

  it('rejects strings that are not real days', () => {
    expect(isISODate('2026-11-07')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('7/11/2026')).toBe(false);
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-11-07', '2026-11-10')).toBe(3);
  });

  it('counts only days before today as overdue', () => {
    expect(isOverdue('2026-11-06', NOW)).toBe(true);
    expect(isOverdue('2026-11-07', NOW)).toBe(false);
    expect(isOverdue(null, NOW)).toBe(false);
  });

  it('finds the start of the week for Monday and Sunday starts', () => {
    expect(startOfWeek('2026-11-07', 1)).toBe('2026-11-02');
    expect(startOfWeek('2026-11-07', 0)).toBe('2026-11-01');
    expect(startOfWeek('2026-11-02', 1)).toBe('2026-11-02');
  });

  it('labels nearby days in words', () => {
    expect(relativeDay('2026-11-07', NOW)).toBe('Today');
    expect(relativeDay('2026-11-08', NOW)).toBe('Tomorrow');
    expect(relativeDay('2026-11-06', NOW)).toBe('Yesterday');
  });
});
