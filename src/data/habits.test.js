import { createHabit, describeSchedule, doneOn, habitsDueOn, isScheduled, normalizeSchedule, weekOrder } from './habits';
import { parseISODate } from '../utils/dates';

describe('habits', () => {
  it('treats every day, or no day, as daily', () => {
    expect(normalizeSchedule([0, 1, 2, 3, 4, 5, 6])).toBe('daily');
    expect(normalizeSchedule([])).toBe('daily');
    expect(normalizeSchedule([5, 1, 3, 1, 9])).toEqual([1, 3, 5]);
    expect(createHabit({ name: 'Gym', schedule: [3, 1] }, 1, 0)).toEqual({
      id: 1,
      name: 'Gym',
      schedule: [1, 3],
      createdAt: 0,
      archived: false,
    });
  });

  it('knows which days a habit is due', () => {
    const gym = { schedule: [1, 3, 5] };
    expect(isScheduled(gym, '2026-11-09')).toBe(true); // a Monday
    expect(isScheduled(gym, '2026-11-10')).toBe(false);
    expect(isScheduled({ schedule: 'daily' }, '2026-11-10')).toBe(true);
  });

  it('describes a schedule in the order the week runs', () => {
    expect(describeSchedule('daily')).toBe('Every day');
    expect(describeSchedule([1, 2, 3, 4, 5])).toBe('Weekdays');
    expect(describeSchedule([0, 6])).toBe('Weekends');
    expect(weekOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weekOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it('lists the habits due on a day, leaving out archived ones and those not made yet', () => {
    const made = (iso) => parseISODate(iso).getTime();
    const habits = [
      { id: 1, schedule: 'daily', createdAt: made('2026-11-01'), archived: false },
      { id: 2, schedule: [1], createdAt: made('2026-11-01'), archived: false },
      { id: 3, schedule: 'daily', createdAt: made('2026-11-01'), archived: true },
      { id: 4, schedule: 'daily', createdAt: made('2026-11-20'), archived: false },
    ];
    expect(habitsDueOn(habits, '2026-11-10').map((habit) => habit.id)).toEqual([1]);
    expect(habitsDueOn(habits, '2026-11-09').map((habit) => habit.id)).toEqual([1, 2]);
    expect(doneOn({ 1: ['2026-11-09'] }, habits[0], '2026-11-09')).toBe(true);
    expect(doneOn({}, habits[0], '2026-11-09')).toBe(false);
  });
});
