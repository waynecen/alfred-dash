import { dayTally, habitStreaks, rangeTally } from './streaks';
import { parseISODate } from './dates';

const made = (iso) => parseISODate(iso).getTime();

describe('habitStreaks', () => {
  const daily = { schedule: 'daily', createdAt: made('2026-11-01') };

  it('counts the run of days done up to today', () => {
    expect(habitStreaks(daily, ['2026-11-05', '2026-11-06', '2026-11-07'], '2026-11-07')).toEqual({ current: 3, best: 3 });
  });

  it('does not break a streak for today until today is over', () => {
    expect(habitStreaks(daily, ['2026-11-05', '2026-11-06'], '2026-11-07').current).toBe(2);
  });

  it('ends a streak on a missed day, and keeps the best', () => {
    const done = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06'];
    expect(habitStreaks(daily, done, '2026-11-07')).toEqual({ current: 2, best: 3 });
    expect(habitStreaks(daily, done, '2026-11-08')).toEqual({ current: 0, best: 3 });
  });

  it('passes over the days a habit is not due', () => {
    // Mondays, Wednesdays and Fridays, from Monday 2 November 2026.
    const gym = { schedule: [1, 3, 5], createdAt: made('2026-11-02') };
    expect(habitStreaks(gym, ['2026-11-02', '2026-11-04', '2026-11-06'], '2026-11-08')).toEqual({ current: 3, best: 3 });
    // Doing it on a rest day (Sunday the 8th) still counts.
    expect(habitStreaks(gym, ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-08'], '2026-11-08').current).toBe(4);
    // Missing Wednesday breaks it.
    expect(habitStreaks(gym, ['2026-11-02', '2026-11-06'], '2026-11-08')).toEqual({ current: 1, best: 1 });
  });

  it('counts days filled in before the habit was made', () => {
    const late = { schedule: 'daily', createdAt: made('2026-11-07') };
    expect(habitStreaks(late, ['2026-11-05', '2026-11-06', '2026-11-07'], '2026-11-07').current).toBe(3);
  });
});

describe('tallies', () => {
  const habits = [
    { id: 1, schedule: 'daily', createdAt: made('2026-11-01') },
    { id: 2, schedule: [1, 3, 5], createdAt: made('2026-11-01') },
    { id: 3, schedule: 'daily', createdAt: made('2026-11-20') },
  ];
  const log = { 1: ['2026-11-09'], 2: ['2026-11-09', '2026-11-11'] };

  it('counts what was due and done on a day, leaving out habits not made yet', () => {
    expect(dayTally(habits, log, '2026-11-09')).toEqual({ due: 2, done: 2 });
    expect(dayTally(habits, log, '2026-11-10')).toEqual({ due: 1, done: 0 });
  });

  it('counts one habit over a run of days', () => {
    expect(rangeTally(habits[1], log[2], '2026-11-09', '2026-11-15')).toEqual({ due: 3, done: 2 });
  });
});
