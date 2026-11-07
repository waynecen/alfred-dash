import { dayKey, dueReminders, eventKey, reviewKey } from './useReminders';

// Saturday 7 November 2026, 14:52.
const now = new Date(2026, 10, 7, 14, 52);
const event = (id, start, date = '2026-11-07') => ({ id, title: `Event ${id}`, date, start, end: null });

describe('dueReminders', () => {
  const events = [event(1, '15:00'), event(2, '15:30'), event(3, '14:30'), event(4, null), event(5, '15:00', '2026-11-08')];

  it('reminds about events starting in the next ten minutes, today only', () => {
    const { events: soon } = dueReminders({ events, tasks: [], now, sent: {} });
    expect(soon.map((e) => e.id)).toEqual([1]);
  });

  it('never repeats a reminder already given', () => {
    const sent = { [eventKey(events[0])]: true };
    expect(dueReminders({ events, tasks: [], now, sent }).events).toEqual([]);
  });

  it('sums up tasks due and overdue once a day', () => {
    const tasks = [
      { completed: false, dueDate: '2026-11-07' },
      { completed: false, dueDate: '2026-11-01' },
      { completed: true, dueDate: '2026-11-07' },
      { completed: false, dueDate: '2026-11-09' },
    ];
    expect(dueReminders({ events: [], tasks, now, sent: {} }).due).toEqual({ today: 1, overdue: 1 });
    expect(dueReminders({ events: [], tasks, now, sent: { [dayKey('2026-11-07')]: true } }).due).toBeNull();
    expect(dueReminders({ events: [], tasks, now, sent: {}, withDue: false }).due).toBeNull();
  });
});

describe('dueReminders review', () => {
  it('nudges about the weekly review once on the day it is due', () => {
    expect(dueReminders({ events: [], tasks: [], now, sent: {}, reviewDue: true }).review).toBe(true);
    expect(dueReminders({ events: [], tasks: [], now, sent: {}, reviewDue: false }).review).toBe(false);
    expect(dueReminders({ events: [], tasks: [], now, sent: { [reviewKey('2026-11-07')]: true }, reviewDue: true }).review).toBe(false);
    expect(dueReminders({ events: [], tasks: [], now, sent: {}, reviewDue: true, withDue: false }).review).toBe(false);
  });
});
