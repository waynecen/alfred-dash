import countTasks from './countTasks';

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
