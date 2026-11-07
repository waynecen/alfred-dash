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
    expect(actions.addTask).toHaveBeenCalledWith('Call the bank', 'medium', {
      dueDate: null,
      tags: [],
      recurrence: null,
    });
  });

  it('reads quick-add extras out of the typed task', () => {
    const { commands, actions } = build('Call the bank !high #money');
    const addTask = commands.find((command) => command.id === 'add-task');
    expect(addTask.label).toBe('Add task “Call the bank” · High · #money');
    addTask.run();
    expect(actions.addTask).toHaveBeenCalledWith('Call the bank', 'high', {
      dueDate: null,
      tags: ['money'],
      recurrence: null,
    });
  });

  it('has no add-task command without a query', () => {
    expect(build().commands.some((command) => command.id === 'add-task')).toBe(false);
  });
});

describe('buildCommands for boards', () => {
  const boards = [
    { id: 'home', name: 'Home' },
    { id: 'work', name: 'Work' },
  ];

  function buildWithBoards(query = '') {
    const actions = {
      addWidget: vi.fn(),
      removeWidget: vi.fn(),
      focusWidget: vi.fn(),
      addTask: vi.fn(),
      switchBoard: vi.fn(),
      addBoard: vi.fn(),
      renameBoard: vi.fn(),
      deleteBoard: vi.fn(),
      moveWidget: vi.fn(),
    };
    const commands = buildCommands({ widgets, shownIds: ['summary'], query, actions, boards, activeBoardId: 'home' });
    const find = (label) => commands.find((command) => command.label === label);
    return { commands, actions, find };
  }

  it('switches to, moves widgets to, and deletes boards', () => {
    const { actions, find } = buildWithBoards();
    find('Switch to Work').run();
    expect(actions.switchBoard).toHaveBeenCalledWith('work');
    find('Move Summary to Work').run();
    expect(actions.moveWidget).toHaveBeenCalledWith('summary', 'work');
    expect(find('Switch to Home')).toBeUndefined(); // already there
    expect(find('Delete board “Home”')).toBeDefined();
  });

  it('names a new board or renames this one from what was typed', () => {
    buildWithBoards('new board Errands').find('New board “Errands”').run();
    const { actions, find } = buildWithBoards('rename to Personal');
    find('Rename this board to “Personal”').run();
    expect(actions.renameBoard).toHaveBeenCalledWith('Personal');
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

describe('buildCommands focus timer', () => {
  const base = { widgets: {}, shownIds: [], theme: 'light' };
  const timer = { toggle: () => {}, stop: () => {} };
  const labels = (focus) =>
    buildCommands({ ...base, focus, actions: { focusTimer: timer } })
      .filter((command) => command.group === 'Focus')
      .map((command) => command.label);

  it('starts, pauses or resumes, and stops once something is running', () => {
    expect(labels({ phase: 'idle', running: false, paused: false })).toEqual(['Start focus session']);
    expect(labels({ phase: 'work', running: true, paused: false })).toEqual(['Pause focus', 'Stop the focus timer']);
    expect(labels({ phase: 'break', running: false, paused: true })).toEqual(['Resume break', 'Stop the focus timer']);
  });
});

describe('buildCommands habits', () => {
  it('ticks off a habit due today, and adds one from "habit …"', () => {
    const actions = { toggleHabitDay: vi.fn(), addHabit: vi.fn() };
    const habitsToday = [{ id: 4, name: 'Stretch' }];
    const commands = buildCommands({ widgets: {}, shownIds: [], actions, habitsToday, query: 'habit Read 20 minutes' });
    commands.find((command) => command.label === 'Tick off “Stretch” for today').run();
    expect(actions.toggleHabitDay).toHaveBeenCalledWith(4);
    const add = commands.find((command) => command.id === 'add-habit');
    expect(add.label).toBe('Add habit “Read 20 minutes” · every day');
    add.run();
    expect(actions.addHabit).toHaveBeenCalledWith({ name: 'Read 20 minutes' });
  });
});
