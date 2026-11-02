import filterTasks from './filterTasks';

const tasks = [
  { id: 1, completed: false },
  { id: 2, completed: true },
  { id: 3, completed: false },
];

const ids = (list) => list.map((task) => task.id);

describe('filterTasks', () => {
  it('returns everything for "all" or when no status is given', () => {
    expect(ids(filterTasks(tasks, { status: 'all' }))).toEqual([1, 2, 3]);
    expect(ids(filterTasks(tasks, {}))).toEqual([1, 2, 3]);
  });

  it('keeps only active tasks', () => {
    expect(ids(filterTasks(tasks, { status: 'active' }))).toEqual([1, 3]);
  });

  it('keeps only completed tasks', () => {
    expect(ids(filterTasks(tasks, { status: 'completed' }))).toEqual([2]);
  });
});
