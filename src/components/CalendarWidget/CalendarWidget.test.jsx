import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import CalendarWidget, { TASK_DRAG_TYPE } from './CalendarWidget';
import { addDays, parseISODate, toISODate } from '../../utils/dates';

const today = toISODate();
const longDay = (iso) => parseISODate(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

function setup({ events = [], tasks = [] } = {}) {
  const handlers = { onAddEvent: vi.fn(), onDeleteEvent: vi.fn(), onSetTaskDue: vi.fn(), onToggleTask: vi.fn() };
  render(<CalendarWidget events={events} tasks={tasks} {...handlers} />);
  return handlers;
}

describe('CalendarWidget', () => {
  it('starts on today, and lists its events and the tasks due', () => {
    setup({
      events: [{ id: 1, title: 'Lunch', date: today, start: '12:30', end: null }],
      tasks: [{ id: 9, text: 'Call bank', completed: false, dueDate: today }],
    });
    const day = screen.getByRole('gridcell', { name: new RegExp(`^${longDay(today)}, today, 1 event, 1 task due`) });
    expect(day).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByLabelText('Mark complete: Call bank')).toBeInTheDocument();
  });

  it('moves between days with the arrow keys', async () => {
    setup();
    screen.getByRole('gridcell', { selected: true }).focus();
    await userEvent.keyboard('{ArrowRight}');
    const next = screen.getByRole('gridcell', { selected: true });
    expect(next).toHaveAccessibleName(new RegExp(`^${longDay(addDays(today, 1))}`));
    expect(next).toHaveFocus();
  });

  it('adds an event, reading its time and day from the line', async () => {
    const { onAddEvent } = setup();
    await userEvent.type(screen.getByLabelText('Add an event'), 'Dentist 3-4pm{Enter}');
    expect(onAddEvent).toHaveBeenCalledWith({ title: 'Dentist', date: today, start: '15:00', end: '16:00' });
  });

  it('deletes an event', async () => {
    const { onDeleteEvent } = setup({ events: [{ id: 1, title: 'Lunch', date: today, start: null, end: null }] });
    await userEvent.click(screen.getByRole('button', { name: 'Delete event: Lunch' }));
    expect(onDeleteEvent).toHaveBeenCalledWith(1);
  });

  it('makes a task dropped on a day due then', () => {
    const { onSetTaskDue } = setup();
    const target = addDays(today, 2);
    const day = screen.getByRole('gridcell', { name: new RegExp(`^${longDay(target)}`) });
    const dataTransfer = { types: [TASK_DRAG_TYPE], getData: () => '42', dropEffect: '' };
    fireEvent.dragOver(day, { dataTransfer });
    fireEvent.drop(day, { dataTransfer });
    expect(onSetTaskDue).toHaveBeenCalledWith(42, target);
  });

  it('shows the week in columns', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(within(screen.getByRole('list', { name: /^Week of/ })).getAllByRole('listitem')).toHaveLength(7);
  });
});
