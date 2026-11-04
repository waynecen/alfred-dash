import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import CommandPalette from './CommandPalette';

function setup() {
  const runs = { notes: vi.fn(), theme: vi.fn(), task: vi.fn() };
  const getCommands = (query) => [
    { id: 'add-notes', group: 'Widgets', label: 'Add Notes widget', run: runs.notes },
    { id: 'theme', group: 'Appearance', label: 'Switch to dark mode', keywords: 'theme', run: runs.theme },
    ...(query.trim()
      ? [{ id: 'add-task', group: 'Tasks', label: `Add task “${query.trim()}”`, run: runs.task, always: true }]
      : []),
  ];
  const onClose = vi.fn();
  render(<CommandPalette getCommands={getCommands} onClose={onClose} />);
  return { runs, onClose };
}

const input = () => screen.getByRole('combobox', { name: 'Search commands' });
const options = () => screen.getAllByRole('option').map((option) => option.textContent);

describe('CommandPalette', () => {
  it('opens focused on the search box with every command listed', () => {
    setup();
    expect(input()).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    expect(options()).toHaveLength(2);
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('filters as you type, and offers to add the text as a task', async () => {
    setup();
    await userEvent.type(input(), 'dark');
    expect(options()).toEqual(['Switch to dark modeAppearance', 'Add task “dark”Tasks']);
  });

  it('matches letters in order, so a few keystrokes are enough', async () => {
    setup();
    await userEvent.type(input(), 'adnw');
    expect(options()[0]).toMatch(/^Add Notes widget/);
  });

  it('moves with the arrow keys, wraps around, and runs the highlighted command on Enter', async () => {
    const { runs, onClose } = setup();
    await userEvent.keyboard('{ArrowDown}');
    expect(input()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(runs.theme).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
  });

  it('runs a command on click', async () => {
    const { runs } = setup();
    await userEvent.click(screen.getByRole('option', { name: /Add Notes/ }));
    expect(runs.notes).toHaveBeenCalledOnce();
  });

  it('says so when nothing matches', async () => {
    const getCommands = () => [{ id: 'a', group: 'G', label: 'Alpha', run() {} }];
    render(<CommandPalette getCommands={getCommands} onClose={() => {}} />);
    await userEvent.type(input(), 'zzz');
    expect(screen.getByText('No matching commands.')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const { onClose } = setup();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledWith('escape');
  });
});
