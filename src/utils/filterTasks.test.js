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

describe('filterTasks by due date, tag and words', () => {
  const today = '2026-11-07';
  const dated = [
    { id: 1, text: 'Pay rent', completed: false, dueDate: '2026-11-05', tags: ['home'] },
    { id: 2, text: 'Call bank', completed: false, dueDate: today, tags: [] },
    { id: 3, text: 'Book dentist', completed: false, dueDate: '2026-11-08', tags: ['health'], notes: 'ask about the filling' },
    { id: 4, text: 'Read', completed: false, dueDate: null, tags: [] },
    { id: 5, text: 'Water plants', completed: true, dueDate: '2026-11-06', tags: ['home'] },
  ];
  const pick = (filter) => ids(filterTasks(dated, filter, today));

  it('finds overdue open tasks only', () => {
    expect(pick({ when: 'overdue' })).toEqual([1]);
  });

  it('finds tasks due today, later, or with no date', () => {
    expect(pick({ when: 'today' })).toEqual([2]);
    expect(pick({ when: 'upcoming' })).toEqual([3]);
    expect(pick({ when: 'nodate' })).toEqual([4]);
  });

  it('keeps tasks with a tag', () => {
    expect(pick({ tag: 'home' })).toEqual([1, 5]);
  });

  it('matches every word against the text, notes and tags, ignoring case', () => {
    expect(pick({ query: 'RENT home' })).toEqual([1]);
    expect(pick({ query: 'filling' })).toEqual([3]);
    expect(pick({ query: '#health' })).toEqual([3]);
  });

  it('combines the parts', () => {
    expect(pick({ status: 'active', tag: 'home' })).toEqual([1]);
  });
});
