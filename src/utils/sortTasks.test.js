import sortTasks from './sortTasks';

const tasks = [
  { id: 1, text: 'banana', priority: 'high', createdAt: 300 },
  { id: 2, text: 'Apple', priority: 'low', createdAt: 100 },
  { id: 3, text: 'cherry', priority: 'medium', createdAt: 200 },
];

const ids = (list) => list.map((task) => task.id);

describe('sortTasks', () => {
  it('keeps the original order when there is no sort', () => {
    expect(ids(sortTasks(tasks, null))).toEqual([1, 2, 3]);
  });

  it('sorts priority from low to high, then high to low', () => {
    expect(ids(sortTasks(tasks, { key: 'priority', direction: 'asc' }))).toEqual([2, 3, 1]);
    expect(ids(sortTasks(tasks, { key: 'priority', direction: 'desc' }))).toEqual([1, 3, 2]);
  });

  it('sorts descriptions A to Z and Z to A, ignoring case', () => {
    expect(ids(sortTasks(tasks, { key: 'description', direction: 'asc' }))).toEqual([2, 1, 3]);
    expect(ids(sortTasks(tasks, { key: 'description', direction: 'desc' }))).toEqual([3, 1, 2]);
  });

  it('sorts created oldest first, then newest first', () => {
    expect(ids(sortTasks(tasks, { key: 'created', direction: 'asc' }))).toEqual([2, 3, 1]);
    expect(ids(sortTasks(tasks, { key: 'created', direction: 'desc' }))).toEqual([1, 3, 2]);
  });

  it('treats a missing priority as medium', () => {
    const mixed = [
      { id: 1, text: 'a', priority: 'high' },
      { id: 2, text: 'b' },
      { id: 3, text: 'c', priority: 'low' },
    ];
    expect(ids(sortTasks(mixed, { key: 'priority', direction: 'asc' }))).toEqual([3, 2, 1]);
  });

  it('falls back to the id when a task has no createdAt', () => {
    const old = [
      { id: 500, text: 'a' },
      { id: 400, text: 'b', createdAt: 450 },
    ];
    expect(ids(sortTasks(old, { key: 'created', direction: 'asc' }))).toEqual([400, 500]);
  });

  it('keeps tied tasks in their original order in both directions', () => {
    const ties = [
      { id: 1, text: 'a', priority: 'low' },
      { id: 2, text: 'b', priority: 'low' },
      { id: 3, text: 'c', priority: 'high' },
    ];
    expect(ids(sortTasks(ties, { key: 'priority', direction: 'asc' }))).toEqual([1, 2, 3]);
    expect(ids(sortTasks(ties, { key: 'priority', direction: 'desc' }))).toEqual([3, 1, 2]);
  });

  it('does not change the list it was given', () => {
    const before = ids(tasks);
    sortTasks(tasks, { key: 'priority', direction: 'desc' });
    expect(ids(tasks)).toEqual(before);
  });
});

describe('sortTasks by due date', () => {
  const dated = [
    { id: 1, text: 'a', dueDate: '2026-11-20' },
    { id: 2, text: 'b', dueDate: null },
    { id: 3, text: 'c', dueDate: '2026-11-08' },
    { id: 4, text: 'd' },
  ];

  it('puts the soonest first, then the latest first, with undated tasks last both ways', () => {
    expect(ids(sortTasks(dated, { key: 'due', direction: 'asc' }))).toEqual([3, 1, 2, 4]);
    expect(ids(sortTasks(dated, { key: 'due', direction: 'desc' }))).toEqual([1, 3, 2, 4]);
  });
});
