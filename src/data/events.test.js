import { compareEvents, createEvent, describeEventTime, eventsOn } from './events';

describe('events', () => {
  const events = [
    createEvent({ title: 'Late', date: '2026-11-07', start: '18:00' }, 1, 0),
    createEvent({ title: 'All day', date: '2026-11-07' }, 2, 0),
    createEvent({ title: 'Early', date: '2026-11-07', start: '09:00', end: '10:00' }, 3, 0),
    createEvent({ title: 'Other day', date: '2026-11-08', start: '08:00' }, 4, 0),
  ];

  it('lists a day in order: all-day first, then by start time', () => {
    expect(eventsOn(events, '2026-11-07').map((event) => event.title)).toEqual(['All day', 'Early', 'Late']);
    expect([...events].sort(compareEvents)[0].title).toBe('All day');
  });

  it('drops an end time that has no start', () => {
    expect(createEvent({ title: 'x', date: '2026-11-07', end: '10:00' }, 5, 0).end).toBeNull();
  });

  it('describes when it happens, on the clock setting', () => {
    expect(describeEventTime(events[1])).toBe('All day');
    expect(describeEventTime(events[2], { hourCycle: 'h23' })).toBe('09:00–10:00');
  });
});
