import { vi } from 'vitest';
import { buildCommands, matchCommands } from './commands';

const widgets = {
  summary: { title: 'Summary', description: 'Counts' },
  notes: { title: 'Notes', description: 'A notepad' },
};

function build(query = '', theme = 'light') {
  const actions = {
    addWidget: vi.fn(),
    removeWidget: vi.fn(),
    focusWidget: vi.fn(),
    addTask: vi.fn(),
    toggleTheme: vi.fn(),
    resetLayout: vi.fn(),
    openSettings: vi.fn(),
  };
  const commands = buildCommands({ widgets, shownIds: ['summary'], query, actions, theme });
  return { commands, actions, labels: commands.map((command) => command.label) };
}

describe('buildCommands', () => {
  it('offers to go to or remove shown widgets, and to add the others', () => {
    const { labels } = build();
    expect(labels).toContain('Go to Summary');
    expect(labels).toContain('Remove Summary widget');
    expect(labels).toContain('Add Notes widget');
    expect(labels).not.toContain('Add Summary widget');
  });

  it('names the theme you would switch to', () => {
    expect(build('', 'light').labels).toContain('Switch to dark mode');
    expect(build('', 'dark').labels).toContain('Switch to light mode');
  });

  it('adds what was typed as a medium-priority task', () => {
    const { commands, actions } = build('  Call the bank ');
    const addTask = commands.find((command) => command.id === 'add-task');
    expect(addTask.label).toBe('Add task “Call the bank”');
    addTask.run();
    expect(actions.addTask).toHaveBeenCalledWith('Call the bank', 'medium');
  });

  it('has no add-task command without a query', () => {
    expect(build().commands.some((command) => command.id === 'add-task')).toBe(false);
  });
});

describe('matchCommands', () => {
  const commands = [
    { id: 'a', label: 'Add Notes widget', keywords: 'new' },
    { id: 'b', label: 'Remove Notes widget', keywords: 'delete' },
    { id: 'c', label: 'Reset layout', keywords: 'default' },
    { id: 'd', label: 'Add task “x”', always: true },
  ];
  const ids = (query) => matchCommands(commands, query).map((command) => command.id);

  it('returns every fixed command for an empty query', () => {
    expect(ids('')).toEqual(['a', 'b', 'c']);
  });

  it('ranks a label prefix over a word prefix, and keeps "always" commands last', () => {
    expect(ids('re')).toEqual(['b', 'c', 'd']);
    expect(ids('notes')).toEqual(['a', 'b', 'd']);
  });

  it('matches keywords after labels', () => {
    expect(ids('delete')).toEqual(['b', 'd']);
  });

  it('matches letters in order', () => {
    expect(ids('rsl')).toEqual(['c', 'd']);
  });
});
