import { migrate, runMigrations, readVersion } from './migrate';
import { SCHEMA_VERSION, VERSION_KEY, PRE_MIGRATION_KEY } from './schema';

describe('migrate', () => {
  it('fills in fields that version 1 tasks lack, keeping what they have', () => {
    const v1 = { tasks: [{ id: 5, text: 'Old', completed: true }], notes: 'hi' };
    const { tasks, notes } = migrate(v1, 1);
    expect(tasks[0]).toMatchObject({
      id: 5,
      text: 'Old',
      completed: true,
      priority: 'medium',
      createdAt: 5,
      dueDate: null,
      tags: [],
      parentId: null,
      recurrence: null,
    });
    expect(notes).toBe('hi');
    expect(v1.tasks[0]).not.toHaveProperty('dueDate'); // the input is untouched
  });

  it('leaves current data alone', () => {
    const data = { tasks: [] };
    expect(migrate(data, SCHEMA_VERSION)).toBe(data);
  });

  it('upgrades storage once and keeps a copy of the old data', () => {
    localStorage.setItem('tasks', JSON.stringify([{ id: 1, text: 'A', completed: false }]));
    runMigrations();
    expect(readVersion()).toBe(SCHEMA_VERSION);
    expect(JSON.parse(localStorage.getItem('tasks'))[0].tags).toEqual([]);
    expect(JSON.parse(localStorage.getItem(PRE_MIGRATION_KEY)).data.tasks[0]).not.toHaveProperty('tags');
  });

  it('marks a new browser as current without saving a copy', () => {
    runMigrations();
    expect(localStorage.getItem(VERSION_KEY)).toBe(String(SCHEMA_VERSION));
    expect(localStorage.getItem(PRE_MIGRATION_KEY)).toBeNull();
  });
});
