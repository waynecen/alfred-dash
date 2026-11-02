import { vi } from 'vitest';
import formatCreatedDate from './formatCreatedDate';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatCreatedDate', () => {
  const now = new Date(2026, 10, 2, 12, 0, 0).getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [0, 'just now'],
    [59 * 1000, 'just now'],
    [MINUTE, '1m ago'],
    [45 * MINUTE, '45m ago'],
    [HOUR, '1h ago'],
    [5 * HOUR, '5h ago'],
    [DAY, '1d ago'],
    [3 * DAY, '3d ago'],
  ])('formats an age of %i ms as "%s"', (age, expected) => {
    expect(formatCreatedDate(now - age)).toBe(expected);
  });

  it('shows an exact dd-mm-yyyy date after more than 3 days', () => {
    const old = new Date(2026, 9, 5, 9, 0, 0).getTime(); // 5 Oct 2026
    expect(formatCreatedDate(old)).toBe('05-10-2026');
  });
});
