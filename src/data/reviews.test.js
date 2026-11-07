import { focusByDay, isReviewed, overdueTasks, reviewStats, reviewWeek, tasksDoneIn, topFocusTask } from './reviews';
import { parseISODate } from '../utils/dates';

// Noon on a day, as a timestamp.
const at = (iso, hour = 12) => parseISODate(iso).getTime() + hour * 3600 * 1000;

describe('reviewWeek', () => {
  it('looks back on the week just ended on its first day', () => {
    // Monday 9 November 2026, weeks starting on Monday.
    expect(reviewWeek('2026-11-09', 1)).toEqual({ from: '2026-11-02', to: '2026-11-08' });
  });

  it('looks at this week so far on any other day', () => {
    expect(reviewWeek('2026-11-07', 1)).toEqual({ from: '2026-11-02', to: '2026-11-07' });
    // Weeks starting on Sunday: Saturday the 7th is the last day of the week from the 1st.
    expect(reviewWeek('2026-11-07', 0)).toEqual({ from: '2026-11-01', to: '2026-11-07' });
  });

  it('knows which weeks were reviewed', () => {
    expect(isReviewed([{ week: '2026-11-02' }], '2026-11-02')).toBe(true);
    expect(isReviewed([], '2026-11-02')).toBe(false);
  });
});

describe('the week in numbers', () => {
  const week = { from: '2026-11-02', to: '2026-11-08' };
  const tasks = [
    { id: 1, completed: true, completedAt: at('2026-11-03'), tags: [] },
    { id: 2, completed: true, completedAt: at('2026-11-05'), tags: ['launch'] },
    { id: 3, completed: true, completedAt: at('2026-10-30'), tags: [] },
    { id: 4, completed: false, dueDate: '2026-11-06', tags: ['launch'] },
    { id: 5, completed: false, dueDate: '2026-11-20', tags: [] },
  ];
  const sessions = [
    { taskId: 4, startedAt: at('2026-11-03', 9), minutes: 25 },
    { taskId: 4, startedAt: at('2026-11-03', 10), minutes: 25 },
    { taskId: 5, startedAt: at('2026-11-04'), minutes: 30 },
    { taskId: 5, startedAt: at('2026-10-20'), minutes: 90 },
  ];

  it('lists the tasks done in the week, the latest first, and what is overdue', () => {
    expect(tasksDoneIn(tasks, week).map((task) => task.id)).toEqual([2, 1]);
    expect(overdueTasks(tasks, '2026-11-07').map((task) => task.id)).toEqual([4]);
  });

  it('adds up focus minutes by day, and finds the task worked on most', () => {
    const days = focusByDay(sessions, week);
    expect(days).toHaveLength(7);
    expect(days[1]).toEqual({ date: '2026-11-03', count: 50 });
    expect(topFocusTask(sessions, week)).toEqual({ taskId: 4, minutes: 50 });
  });

  it('keeps the totals', () => {
    const habits = [{ id: 1, schedule: 'daily', createdAt: at('2026-10-01'), archived: false }];
    const habitLog = { 1: ['2026-11-02', '2026-11-03'] };
    const goals = [{ id: 1, kind: 'tasks', tag: 'launch' }, { id: 2, kind: 'count', target: 3, progress: 3 }];
    expect(reviewStats({ tasks, habits, habitLog, sessions, goals, week, today: '2026-11-07' })).toEqual({
      tasksDone: 2,
      overdue: 1,
      habitsDue: 7,
      habitsDone: 2,
      focusMinutes: 80,
      goals: 2,
      goalsReached: 1,
    });
  });
});
