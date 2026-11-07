import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import FocusWidget from './FocusWidget';
import { DEFAULT_LENGTHS } from '../../data/focus';

const ready = { phase: 'idle', running: false, paused: false, left: 25 * 60 * 1000, label: 'Ready', round: 1, lengths: DEFAULT_LENGTHS, taskId: null, minutesToday: 50 };
const actions = () => ({ start: vi.fn(), pause: vi.fn(), stop: vi.fn(), skip: vi.fn(), setTask: vi.fn(), setLengths: vi.fn() });
const tasks = [{ id: 1, text: 'Write report', completed: false }];

describe('FocusWidget', () => {
  it('shows the time, the round and the minutes focused today', () => {
    render(<FocusWidget focus={ready} actions={actions()} tasks={tasks} />);
    expect(screen.getByRole('timer', { name: 'Ready: 25 minutes left' })).toHaveTextContent('25:00');
    expect(screen.getByRole('img', { name: '1 of 4 sessions before a long break' })).toBeInTheDocument();
    expect(screen.getByText('min focused today').previousSibling).toHaveTextContent('50');
  });

  it('starts, and links the session to a task', async () => {
    const handlers = actions();
    render(<FocusWidget focus={ready} actions={handlers} tasks={tasks} />);
    await userEvent.selectOptions(screen.getByLabelText('Working on'), 'Write report');
    expect(handlers.setTask).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole('button', { name: 'Start focus' }));
    expect(handlers.start).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
  });

  it('pauses a running session, or breaks early', async () => {
    const handlers = actions();
    render(<FocusWidget focus={{ ...ready, phase: 'work', running: true, label: 'Focus' }} actions={handlers} tasks={tasks} />);
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await userEvent.click(screen.getByRole('button', { name: 'Take a break' }));
    expect(handlers.pause).toHaveBeenCalled();
    expect(handlers.skip).toHaveBeenCalled();
  });
});
