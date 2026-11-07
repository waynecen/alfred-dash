import { createGoal, describeProgress, goalProgress, isReached, parseGoal } from './goals';
import { parseISODate } from '../utils/dates';

const now = parseISODate('2026-11-07');

describe('parseGoal', () => {
  it('reads a number to reach, and what is counted', () => {
    expect(parseGoal('Read 12 books', { now })).toEqual({ title: 'Read 12 books', kind: 'count', target: 12, unit: 'books', dueDate: null });
    expect(parseGoal('Run 100km', { now })).toMatchObject({ target: 100, unit: 'km' });
  });

  it('takes a date out of the title', () => {
    expect(parseGoal('Read 12 books by dec 31', { now })).toMatchObject({ title: 'Read 12 books', dueDate: '2026-12-31' });
  });

  it('makes a goal of the tasks with a tag', () => {
    expect(parseGoal('Launch v2 #launch', { now })).toEqual({ title: 'Launch v2', kind: 'tasks', tag: 'launch', dueDate: null });
    expect(parseGoal('#launch', { now }).title).toBe('#launch');
  });

  it('counts a goal with no number as one thing to do', () => {
    expect(parseGoal('Learn to juggle', { now })).toMatchObject({ kind: 'count', target: 1, unit: '' });
  });
});

describe('goal progress', () => {
  const tasks = [
    { id: 1, tags: ['launch'], completed: true },
    { id: 2, tags: ['launch'], completed: false },
    { id: 3, tags: ['home'], completed: true },
  ];

  it('counts a tasks goal from its tagged tasks', () => {
    const goal = createGoal({ title: 'Launch', kind: 'tasks', tag: 'launch' }, 1, 0);
    expect(goal.target).toBeNull();
    expect(goalProgress(goal, tasks)).toEqual({ done: 1, total: 2 });
    expect(describeProgress(goal, goalProgress(goal, tasks))).toBe('1 of 2 tasks');
  });

  it('counts a count goal from its own progress', () => {
    const goal = createGoal({ title: 'Read', target: 12, progress: 12, unit: 'books' }, 1, 0);
    expect(isReached(goalProgress(goal))).toBe(true);
    expect(describeProgress(goal, goalProgress(goal))).toBe('12 of 12 books');
    expect(isReached({ done: 0, total: 0 })).toBe(false);
  });
});
