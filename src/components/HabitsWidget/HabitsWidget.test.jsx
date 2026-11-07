import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import HabitsWidget from './HabitsWidget';
import { addDays, parseISODate, toISODate } from '../../utils/dates';

const today = toISODate();
const longAgo = parseISODate(addDays(today, -30)).getTime();

beforeEach(() => localStorage.clear());

function setup({ habits = [], log = {} } = {}) {
  const actions = {
    addHabit: vi.fn(),
    updateHabit: vi.fn(),
    toggleHabitDay: vi.fn(),
    archiveHabit: vi.fn(),
    deleteHabit: vi.fn(),
  };
  render(<HabitsWidget habits={habits} log={log} actions={actions} />);
  return actions;
}

const read = { id: 1, name: 'Read', schedule: 'daily', createdAt: longAgo, archived: false };

describe('HabitsWidget', () => {
  it('invites the first habit when there are none', () => {
    setup();
    expect(screen.getByText(/Add a habit to keep/)).toBeInTheDocument();
  });

  it('shows the last seven days, how many are done today, and the streak', () => {
    setup({ habits: [read], log: { 1: [addDays(today, -2), addDays(today, -1)] } });
    expect(screen.getByText('0 of 1 done today')).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /^Read/ });
    expect(within(row).getAllByRole('button', { pressed: true })).toHaveLength(2);
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText('Best 2')).toBeInTheDocument();
  });

  it('ticks a day off', async () => {
    const actions = setup({ habits: [read] });
    await userEvent.click(screen.getByRole('button', { name: 'Read, today' }));
    expect(actions.toggleHabitDay).toHaveBeenCalledWith(1, today);
  });

  it('moves along the days with the arrow keys', async () => {
    setup({ habits: [read] });
    screen.getByRole('button', { name: 'Read, today' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toHaveAccessibleName(/^Read, /);
    expect(document.activeElement).not.toHaveAccessibleName('Read, today');
  });

  it('adds a habit on the days picked', async () => {
    const actions = setup();
    await userEvent.type(screen.getByLabelText('New habit'), 'Gym');
    // Every day is on to start with; turning Tuesday off leaves the other six.
    await userEvent.click(screen.getByRole('button', { name: 'Tuesday' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(actions.addHabit).toHaveBeenCalledWith({ name: 'Gym', schedule: [0, 1, 3, 4, 5, 6] });
  });

  it('renames a habit, and archives it from the editor', async () => {
    const actions = setup({ habits: [read] });
    await userEvent.click(screen.getByRole('button', { name: 'Read' }));
    const name = screen.getByLabelText('Habit name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Read 20 minutes{Enter}');
    expect(actions.updateHabit).toHaveBeenCalledWith(1, { name: 'Read 20 minutes', schedule: 'daily' });
    await userEvent.click(screen.getByRole('button', { name: 'Read' }));
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(actions.archiveHabit).toHaveBeenCalledWith(1);
  });

  it('lists archived habits to restore', async () => {
    const actions = setup({ habits: [{ ...read, archived: true }] });
    await userEvent.click(screen.getByRole('button', { name: 'Archived (1)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Restore habit: Read' }));
    expect(actions.archiveHabit).toHaveBeenCalledWith(1, false);
  });
});
