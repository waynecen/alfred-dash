import countTasks, { countDue, countTags } from './countTasks';

describe('countTasks', () => {
  it('counts active and completed tasks', () => {
    const tasks = [{ completed: false }, { completed: true }, { completed: false }];
    const { active, completed } = countTasks(tasks);
    expect(active).toBe(2);
    expect(completed).toBe(1);
  });

  it('returns zeros for an empty list', () => {
    expect(countTasks([])).toEqual({
      active: 0,
      completed: 0,
      openByPriority: { high: 0, medium: 0, low: 0 },
    });
  });

  it('counts open tasks at each priority', () => {
    const tasks = [
      { completed: false, priority: 'high' },
      { completed: false, priority: 'high' },
      { completed: false, priority: 'medium' },
      { completed: false, priority: 'low' },
    ];
    expect(countTasks(tasks).openByPriority).toEqual({ high: 2, medium: 1, low: 1 });
  });

  it('leaves completed tasks out of the priority counts', () => {
    const tasks = [
      { completed: true, priority: 'high' },
      { completed: false, priority: 'high' },
    ];
    expect(countTasks(tasks).openByPriority.high).toBe(1);
  });

  it('counts a task with no (or an unknown) priority as medium', () => {
    const tasks = [
      { completed: false },
      { completed: false, priority: 'urgent' },
    ];
    expect(countTasks(tasks).openByPriority).toEqual({ high: 0, medium: 2, low: 0 });
  });
});

describe('countDue', () => {
  it('counts open tasks that are overdue, due today and due later', () => {
    const tasks = [
      { completed: false, dueDate: '2026-11-01' },
      { completed: true, dueDate: '2026-11-01' },
      { completed: false, dueDate: '2026-11-07' },
      { completed: false, dueDate: '2026-11-09' },
      { completed: false, dueDate: '2026-12-01' },
      { completed: false, dueDate: null },
    ];
    expect(countDue(tasks, '2026-11-07')).toEqual({ overdue: 1, today: 1, upcoming: 2 });
  });
});

describe('countTags', () => {
  it('lists every tag, most used first, then A to Z', () => {
    const tasks = [{ tags: ['work', 'home'] }, { tags: ['home'] }, { tags: ['admin'] }, {}];
    expect(countTags(tasks)).toEqual([
      { tag: 'home', count: 2 },
      { tag: 'admin', count: 1 },
      { tag: 'work', count: 1 },
    ]);
  });
});
