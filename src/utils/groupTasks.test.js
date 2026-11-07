import groupTasks, { countSteps } from './groupTasks';

const rows = (list) => groupTasks(list).map(({ task, depth }) => `${'  '.repeat(depth)}${task.id}`);

describe('groupTasks', () => {
  it('puts steps under their parent, keeping their order', () => {
    const tasks = [
      { id: 1, parentId: null },
      { id: 2, parentId: null },
      { id: 3, parentId: 1 },
      { id: 4, parentId: 2 },
      { id: 5, parentId: 1 },
    ];
    expect(rows(tasks)).toEqual(['1', '  3', '  5', '2', '  4']);
  });

  it('leaves a step on its own when its parent is not in the list', () => {
    expect(rows([{ id: 3, parentId: 1 }, { id: 2, parentId: null }])).toEqual(['3', '2']);
  });
});

describe('countSteps', () => {
  it('counts done and total steps for each parent', () => {
    const tasks = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1, completed: true },
      { id: 3, parentId: 1, completed: false },
    ];
    expect(countSteps(tasks).get(1)).toEqual({ done: 1, total: 2 });
    expect(countSteps(tasks).has(2)).toBe(false);
  });
});
