import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TodayWidget from './TodayWidget';
import { addDays, toISODate } from '../../utils/dates';

const today = toISODate();

function setup({ tasks = [], events = [], focus } = {}) {
  const actions = {
    toggleTask: vi.fn(),
    addTask: vi.fn(),
    addEvent: vi.fn(),
    notify: vi.fn(),
    focusTimer: { toggle: vi.fn() },
  };
  render(<TodayWidget tasks={tasks} events={events} focus={focus} actions={actions} />);
  return actions;
}

describe('TodayWidget', () => {
  it('lists today’s events in order, and what is due or overdue', () => {
    setup({
      events: [
        { id: 1, title: 'Late meeting', date: today, start: '23:58', end: null },
        { id: 2, title: 'Birthday', date: today, start: null, end: null },
        { id: 3, title: 'Tomorrow thing', date: addDays(today, 1), start: '09:00', end: null },
      ],
      tasks: [
        { id: 7, text: 'Pay rent', completed: false, dueDate: addDays(today, -2) },
        { id: 8, text: 'Call bank', completed: false, dueDate: today },
        { id: 9, text: 'Later', completed: false, dueDate: addDays(today, 3) },
      ],
    });
    const [schedule, due] = screen.getAllByRole('list');
    expect(within(schedule).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Birthday'),
      expect.stringContaining('Late meeting'),
    ]);
    expect(within(due).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('2 events · 1 due · 1 overdue')).toBeInTheDocument();
  });

  it('adds a line with a time as an event, and one without as a task', async () => {
    const actions = setup();
    const input = screen.getByLabelText('Add a task or an event');
    await userEvent.type(input, 'Lunch 1pm{Enter}');
    expect(actions.addEvent).toHaveBeenCalledWith({ title: 'Lunch', date: today, start: '13:00', end: null });
    await userEvent.type(input, 'Call bank !high{Enter}');
    expect(actions.addTask).toHaveBeenCalledWith('Call bank', 'high', { dueDate: today, tags: [], recurrence: null });
  });

  it('starts the focus timer', async () => {
    const actions = setup({ focus: { phase: 'idle', running: false, paused: false, minutesToday: 25, left: 0, label: 'Ready' } });
    expect(screen.getByText('min so far').previousSibling).toHaveTextContent('25');
    await userEvent.click(screen.getByRole('button', { name: 'Start focus' }));
    expect(actions.focusTimer.toggle).toHaveBeenCalled();
  });
});
