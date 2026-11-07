import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TaskItem from './TaskItem';

const task = { id: 1, text: 'Write tests', completed: false, priority: 'high', createdAt: Date.now() };

function setup(overrides = {}) {
  const handlers = {
    onToggle: vi.fn(),
    onEdit: vi.fn(),
    onPriorityChange: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
  };
  render(
    <table>
      <tbody>
        <TaskItem task={{ ...task, ...overrides }} today="2026-11-07" {...handlers} />
      </tbody>
    </table>
  );
  return handlers;
}

describe('TaskItem', () => {
  it('shows the text, priority and created time', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Write tests' })).toBeInTheDocument();
    expect(screen.getByLabelText('Priority: Write tests')).toHaveValue('high');
    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  it('treats a task with no priority as medium', () => {
    setup({ priority: undefined });
    expect(screen.getByLabelText('Priority: Write tests')).toHaveValue('medium');
  });

  it('toggles completion', async () => {
    const { onToggle } = setup();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('changes priority', async () => {
    const { onPriorityChange } = setup();
    await userEvent.selectOptions(screen.getByLabelText('Priority: Write tests'), 'low');
    expect(onPriorityChange).toHaveBeenCalledWith(1, 'low');
  });

  it('deletes via the labelled trash button', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete task: Write tests' }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  describe('editing', () => {
    async function startEditing() {
      await userEvent.click(screen.getByRole('button', { name: 'Write tests' }));
      return screen.getByLabelText('Edit task');
    }

    it('saves changed, trimmed text on Enter', async () => {
      const { onEdit } = setup();
      const input = await startEditing();
      await userEvent.clear(input);
      await userEvent.type(input, '  Write more tests  {Enter}');
      expect(onEdit).toHaveBeenCalledWith(1, 'Write more tests');
    });

    it('saves when the input loses focus', async () => {
      const { onEdit } = setup();
      const input = await startEditing();
      await userEvent.type(input, ' now');
      await userEvent.tab();
      expect(onEdit).toHaveBeenCalledWith(1, 'Write tests now');
    });

    it('does not save on Escape', async () => {
      const { onEdit } = setup();
      const input = await startEditing();
      await userEvent.type(input, ' changed{Escape}');
      expect(onEdit).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Write tests' })).toBeInTheDocument();
    });

    it('does not save empty or unchanged text', async () => {
      const { onEdit } = setup();
      let input = await startEditing();
      await userEvent.type(input, '{Enter}');
      input = await startEditing();
      await userEvent.clear(input);
      await userEvent.type(input, '   {Enter}');
      expect(onEdit).not.toHaveBeenCalled();
    });
  });
});

describe('TaskItem due date', () => {
  it('shows the due day relative to today and marks it overdue', () => {
    setup({ dueDate: '2026-11-06' });
    expect(screen.getByRole('button', { name: 'Due date: Write tests, Yesterday, overdue' })).toBeInTheDocument();
  });

  it('offers to add a date when there is none', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Due date: Write tests, none' })).toHaveTextContent('Add date');
  });

  it('saves a picked date and clears it', () => {
    const { onUpdate } = setup({ dueDate: '2026-11-08' });
    const input = document.querySelector('input[type="date"]');
    fireEvent.change(input, { target: { value: '2026-11-13' } });
    expect(onUpdate).toHaveBeenCalledWith(1, { dueDate: '2026-11-13' });
    fireEvent.change(input, { target: { value: '' } });
    expect(onUpdate).toHaveBeenLastCalledWith(1, { dueDate: null });
  });
});
