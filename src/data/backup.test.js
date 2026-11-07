import { buildBackup, parseBackup, restoreData, clearData } from './backup';
import { SCHEMA_VERSION } from './schema';

describe('backup', () => {
  it('round-trips everything the dashboard saves', () => {
    localStorage.setItem('tasks', JSON.stringify([{ id: 1, text: 'A' }]));
    localStorage.setItem('notes', JSON.stringify('hello'));
    localStorage.setItem('unrelated', 'kept out');
    const backup = buildBackup();
    expect(backup.version).toBe(SCHEMA_VERSION);
    expect(backup.data).not.toHaveProperty('unrelated');

    clearData();
    expect(localStorage.getItem('notes')).toBeNull();

    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    restoreData(result.backup.data);
    expect(JSON.parse(localStorage.getItem('notes'))).toBe('hello');
    expect(JSON.parse(localStorage.getItem('tasks'))[0].text).toBe('A');
  });

  it('migrates an old backup and drops unknown keys', () => {
    const old = { app: 'dashboard', version: 1, data: { tasks: [{ id: 1, text: 'A' }], junk: 1 } };
    const { backup } = parseBackup(JSON.stringify(old));
    expect(backup.data.tasks[0].tags).toEqual([]);
    expect(backup.data).not.toHaveProperty('junk');
  });

  it('refuses files that are not backups', () => {
    expect(parseBackup('{oops').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ tasks: [] })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'dashboard', version: SCHEMA_VERSION + 1, data: {} })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'dashboard', version: 2, data: { tasks: 'x' } })).ok).toBe(false);
  });

  it('removes keys a backup does not have', () => {
    localStorage.setItem('notes', JSON.stringify('old'));
    restoreData({ tasks: [] });
    expect(localStorage.getItem('notes')).toBeNull();
  });
});
