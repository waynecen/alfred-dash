import parseQuickAdd from './parseQuickAdd';

// Saturday 7 November 2026.
const now = new Date(2026, 10, 7, 10);
const parse = (text, options) => parseQuickAdd(text, { now, ...options });

describe('parseQuickAdd', () => {
  it('reads every kind of extra out of one line', () => {
    expect(parse('Pay rent tomorrow !high #home every month')).toEqual({
      text: 'Pay rent',
      priority: 'high',
      dueDate: '2026-11-08',
      tags: ['home'],
      recurrence: { every: 'month', interval: 1 },
    });
  });

  it('understands the common ways to write a day', () => {
    expect(parse('Gym fri').dueDate).toBe('2026-11-13');
    expect(parse('Gym saturday').dueDate).toBe('2026-11-07'); // today is a Saturday
    expect(parse('Call mom on Monday')).toMatchObject({ text: 'Call mom', dueDate: '2026-11-09' });
    expect(parse('Plan next week').dueDate).toBe('2026-11-09');
    expect(parse('Plan next week', { weekStart: 0 }).dueDate).toBe('2026-11-08');
    expect(parse('Report due next friday').dueDate).toBe('2026-11-13');
    expect(parse('Read in 3 days').dueDate).toBe('2026-11-10');
    expect(parse('Ship 2026-12-01').dueDate).toBe('2026-12-01');
    expect(parse('Trip 20 nov').dueDate).toBe('2026-11-20');
    expect(parse('Dentist nov 3').dueDate).toBe('2027-11-03'); // already passed this year
  });

  it('starts a repeat today unless it names a day', () => {
    expect(parse('Water plants every 2 weeks')).toMatchObject({
      dueDate: '2026-11-07',
      recurrence: { every: 'week', interval: 2 },
    });
    expect(parse('Bins every tuesday')).toMatchObject({
      text: 'Bins',
      dueDate: '2026-11-10',
      recurrence: { every: 'week', interval: 1 },
    });
  });

  it('leaves ordinary words alone', () => {
    expect(parse('Bacon today').text).toBe('Bacon');
    expect(parse('Weekly report').dueDate).toBeNull();
    expect(parse('Write may report').text).toBe('Write may report');
    expect(parse('Book 31 apr').dueDate).toBeNull();
    expect(parse('Buy milk #').tags).toEqual([]);
  });

  it('keeps the whole line when nothing would be left of the task', () => {
    expect(parse('Monday')).toEqual({ text: 'Monday', priority: null, dueDate: null, tags: [], recurrence: null });
  });

  it('keeps each tag once, in lower case', () => {
    expect(parse('Trip #Travel #travel #work').tags).toEqual(['travel', 'work']);
  });
});
