import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import WeeklyReview from './WeeklyReview';
import { addDays, parseISODate, toISODate } from '../../utils/dates';

const today = toISODate();
const noon = (iso) => parseISODate(iso).getTime() + 12 * 3600 * 1000;

beforeEach(() => localStorage.clear());

function setup({ tasks = [], habits = [], habitLog = {}, sessions = [], goals = [], reviews = [] } = {}) {
  const actions = { rescheduleTask: vi.fn(), updateTasks: vi.fn(), toggleTask: vi.fn(), notify: vi.fn() };
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <WeeklyReview
      tasks={tasks}
      habits={habits}
      habitLog={habitLog}
      sessions={sessions}
      goals={goals}
      reviews={reviews}
      actions={actions}
      onSave={onSave}
      onClose={onClose}
    />
  );
  return { actions, onSave, onClose };
}

const step = (name) => userEvent.click(screen.getByRole('button', { name: new RegExp(`^\\d\\d ${name}$`) }));

describe('WeeklyReview', () => {
  it('starts with what got done', () => {
    setup({ tasks: [{ id: 1, text: 'Ship it', completed: true, completedAt: noon(today) }] });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('task done')).toBeInTheDocument();
    expect(screen.getByText('Ship it')).toBeInTheDocument();
  });

  it('moves overdue tasks on', async () => {
    const late = { id: 2, text: 'Call bank', completed: false, dueDate: addDays(today, -3) };
    const { actions } = setup({ tasks: [late] });
    await step('Overdue');
    await userEvent.click(screen.getByRole('button', { name: 'Move to tomorrow: Call bank' }));
    expect(actions.rescheduleTask).toHaveBeenCalledWith(2, addDays(today, 1));
    await userEvent.click(screen.getByRole('button', { name: 'All to tomorrow' }));
    expect(actions.updateTasks).toHaveBeenCalledWith([2], { dueDate: addDays(today, 1) });
  });

  it('walks through the steps with Next and Back', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Next: Overdue' }));
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Overdue');
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Done');
  });

  it('saves the notes and the week’s numbers', async () => {
    const { onSave, onClose, actions } = setup();
    await step('Reflect');
    await userEvent.type(screen.getByLabelText('Notes for the week'), 'A calm week');
    await userEvent.click(screen.getByRole('button', { name: 'Save review' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ notes: 'A calm week', stats: expect.objectContaining({ tasksDone: 0 }) }));
    expect(actions.notify).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('closes without saving when nothing was written', async () => {
    const first = setup();
    await userEvent.keyboard('{Escape}');
    expect(first.onClose).toHaveBeenCalled();
    expect(first.onSave).not.toHaveBeenCalled();
  });
});
