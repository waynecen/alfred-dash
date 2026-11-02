import countTasks from './countTasks';

describe('countTasks', () => {
  it('counts active and completed tasks', () => {
    const tasks = [{ completed: false }, { completed: true }, { completed: false }];
    expect(countTasks(tasks)).toEqual({ active: 2, completed: 1 });
  });

  it('returns zeros for an empty list', () => {
    expect(countTasks([])).toEqual({ active: 0, completed: 0 });
  });
});
