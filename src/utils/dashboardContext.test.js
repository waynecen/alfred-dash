import { buildDashboardContext, formatOpenTasks, formatToday } from './dashboardContext';
import { parseISODate } from './dates';

// Saturday 7 November 2026, 14:52.
const now = new Date(2026, 10, 7, 14, 52);
const at = (iso) => parseISODate(iso).getTime();

const tasks = [
  { id: 11, text: 'Pay rent', priority: 'high', completed: false, dueDate: '2026-11-05', tags: ['home'], parentId: null, createdAt: at('2026-11-01') },
  { id: 12, text: 'Book flights', priority: 'medium', completed: false, dueDate: null, tags: [], parentId: null, createdAt: at('2026-11-02') },
  { id: 13, text: 'Compare prices', priority: 'medium', completed: false, dueDate: null, tags: [], parentId: 12, createdAt: at('2026-11-02') },
  { id: 14, text: 'Send invoices', priority: 'low', completed: true, completedAt: now.getTime() - 1000, tags: [], parentId: null, createdAt: at('2026-11-01') },
];

describe('buildDashboardContext', () => {
  const context = buildDashboardContext(
    {
      tasks,
      events: [
        { id: 1, title: 'Standup', date: '2026-11-07', start: '09:30', end: '09:45' },
        { id: 2, title: 'Holiday', date: '2026-11-30', start: null, end: null },
      ],
      habits: [
        { id: 5, name: 'Read', schedule: 'daily', createdAt: at('2026-10-01'), archived: false },
        { id: 6, name: 'Gym', schedule: [1, 3, 5], createdAt: at('2026-10-01'), archived: false },
      ],
      habitLog: { 5: ['2026-11-06', '2026-11-07'] },
      goals: [{ id: 1, title: 'Read 12 books', kind: 'count', target: 12, progress: 5, unit: 'books', dueDate: '2026-12-31' }],
      focus: { phase: 'idle', minutesToday: 50 },
      notes: 'Ask Sam about the venue',
    },
    { now, weekStart: 1 }
  );

  it('starts with the time, in the form the tools take dates in', () => {
    expect(context).toMatch(/^<dashboard>\nNow: .*\(2026-11-07\), 14:52\. Weeks start on Monday\./);
  });

  it('lists open tasks with their ids, steps under their task, and what was done today', () => {
    expect(context).toContain('- 11 · high · due 2026-11-05 Thu · #home · Pay rent');
    expect(context).toContain('- 12 · medium · Book flights\n  - 13 · medium · Compare prices');
    expect(context).toContain('Done today: Send invoices');
  });

  it('shows two weeks of events, today’s habits with their streaks, goals, focus and notes', () => {
    expect(context).toContain('- 2026-11-07 Sat 09:30–09:45 · Standup');
    expect(context).not.toContain('Holiday');
    expect(context).toContain('- 5 · Read · done today · 2 days in a row');
    expect(context).toContain('Other habits: Gym (id 6, Mon, Wed, Fri)');
    expect(context).toContain('- Read 12 books: 5 of 12 books, by 2026-12-31 Thu');
    expect(context).toContain('Focus timer: not running; 50 min focused today.');
    expect(context).toContain('Ask Sam about the venue');
  });

  it('caps long notes', () => {
    expect(buildDashboardContext({ notes: 'x'.repeat(3000) }, { now })).toContain('the first 1500 of 3000 characters');
  });
});

describe('formatOpenTasks', () => {
  it('says when a task is due, and when it is overdue', () => {
    expect(formatOpenTasks(tasks, '2026-11-07')).toContain('- [high] Pay rent (due 2026-11-05 Thu, overdue)');
  });
});

describe('formatToday', () => {
  it('gives the day’s events and the habits still to do', () => {
    const text = formatToday(
      {
        events: [{ id: 1, title: 'Standup', date: '2026-11-07', start: '09:30', end: null }],
        habits: [{ id: 5, name: 'Read', schedule: 'daily', createdAt: at('2026-10-01'), archived: false }],
        habitLog: {},
      },
      now
    );
    expect(text).toBe("Today's events:\n- 09:30 Standup\n\nHabits still to do today: Read");
  });
});
