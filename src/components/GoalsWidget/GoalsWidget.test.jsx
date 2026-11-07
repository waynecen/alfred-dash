import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import GoalsWidget from './GoalsWidget';
import { addDays, toISODate } from '../../utils/dates';

const today = toISODate();

beforeEach(() => localStorage.clear());

function setup({ goals = [], tasks = [] } = {}) {
  const actions = { addGoal: vi.fn(), updateGoal: vi.fn(), stepGoal: vi.fn(), deleteGoal: vi.fn() };
  render(<GoalsWidget goals={goals} tasks={tasks} actions={actions} />);
  return actions;
}

const books = { id: 1, title: 'Read 12 books', kind: 'count', target: 12, progress: 5, unit: 'books', tag: null, dueDate: null };
const launch = { id: 2, title: 'Launch', kind: 'tasks', target: null, progress: 0, unit: '', tag: 'launch', dueDate: addDays(today, -1) };

describe('GoalsWidget', () => {
  it('invites the first goal when there are none', () => {
    setup();
    expect(screen.getByText(/Set a goal/)).toBeInTheDocument();
  });

  it('shows a count goal with its figure and bar, and steps it', async () => {
    const actions = setup({ goals: [books] });
    expect(screen.getByText('5 of 12 books')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Read 12 books' })).toHaveAttribute('aria-valuenow', '5');
    await userEvent.click(screen.getByRole('button', { name: 'One more: Read 12 books' }));
    expect(actions.stepGoal).toHaveBeenCalledWith(1, 1);
  });

  it('counts a tasks goal from the tasks with its tag, and says when it is late', () => {
    setup({
      goals: [launch],
      tasks: [
        { id: 1, tags: ['launch'], completed: true },
        { id: 2, tags: ['launch'], completed: false },
      ],
    });
    expect(screen.getByText('1 of 2 tasks')).toBeInTheDocument();
    expect(screen.getByText(/#launch · By .* · 1 day late/)).toBeInTheDocument();
  });

  it('puts reached goals after the rest', () => {
    setup({ goals: [{ ...books, progress: 12 }, launch] });
    const [first, second] = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(first).toHaveTextContent('Launch');
    expect(second).toHaveTextContent('Reached');
  });

  it('reads a typed goal before adding it', async () => {
    const actions = setup();
    await userEvent.type(screen.getByLabelText('New goal'), 'Run 100 km');
    expect(screen.getByText('Count to 100 km')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(actions.addGoal).toHaveBeenCalledWith({ title: 'Run 100 km', kind: 'count', target: 100, unit: 'km', dueDate: null });
  });

  it('edits a goal’s figures', async () => {
    const actions = setup({ goals: [books] });
    await userEvent.click(screen.getByRole('button', { name: 'Read 12 books' }));
    const target = screen.getByLabelText('Of');
    await userEvent.clear(target);
    await userEvent.type(target, '20{Enter}');
    expect(actions.updateGoal).toHaveBeenCalledWith(1, { title: 'Read 12 books', dueDate: null, target: 20, progress: 5, unit: 'books' });
  });
});
