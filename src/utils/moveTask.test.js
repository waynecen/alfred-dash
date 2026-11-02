import moveTask from './moveTask';

const ids = (tasks) => tasks.map((task) => task.id);
const list = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

describe('moveTask', () => {
  it('moves a task down to the target position', () => {
    expect(ids(moveTask(list, 1, 3))).toEqual([2, 3, 1, 4]);
  });

  it('moves a task up to the target position', () => {
    expect(ids(moveTask(list, 4, 2))).toEqual([1, 4, 2, 3]);
  });

  it('returns the same list when nothing moves or an id is unknown', () => {
    expect(moveTask(list, 2, 2)).toBe(list);
    expect(moveTask(list, 9, 2)).toBe(list);
    expect(moveTask(list, 2, 9)).toBe(list);
  });

  it('does not change the original list', () => {
    moveTask(list, 1, 4);
    expect(ids(list)).toEqual([1, 2, 3, 4]);
  });
});
