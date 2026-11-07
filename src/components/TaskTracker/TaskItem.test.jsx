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

  it('saves a day picked from the picker and clears it', async () => {
    const { onUpdate } = setup({ dueDate: '2026-11-08' });
    const button = screen.getByRole('button', { name: /^Due date: Write tests/ });
    await userEvent.click(button);
    await userEvent.click(screen.getByRole('gridcell', { name: /\b13\b/ }));
    expect(onUpdate).toHaveBeenCalledWith(1, { dueDate: '2026-11-13' });
    await userEvent.click(button);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onUpdate).toHaveBeenLastCalledWith(1, { dueDate: null });
  });
});

describe('TaskItem details', () => {
  const openDetails = () => userEvent.click(screen.getByRole('button', { name: 'Details: Write tests' }));

  it('opens and closes a detail row under the task', async () => {
    setup();
    const toggle = screen.getByRole('button', { name: 'Details: Write tests' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await openDetails();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    await openDetails();
    expect(screen.queryByLabelText('Notes')).not.toBeInTheDocument();
  });

  it('saves notes when they lose focus', async () => {
    const { onUpdate } = setup();
    await openDetails();
    await userEvent.type(screen.getByLabelText('Notes'), 'Cover the parser');
    expect(onUpdate).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onUpdate).toHaveBeenCalledWith(1, { notes: 'Cover the parser' });
  });

  it('reads tags the way quick-add does', async () => {
    const { onUpdate } = setup({ tags: ['home'] });
    await openDetails();
    const tags = screen.getByLabelText('Tags');
    expect(tags).toHaveValue('#home');
    await userEvent.type(tags, ', Work #home{Enter}');
    expect(onUpdate).toHaveBeenCalledWith(1, { tags: ['home', 'work'] });
    expect(tags).toHaveValue('#home #work');
  });

  it('sets and stops a repeat', async () => {
    const { onUpdate } = setup();
    await openDetails();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Repeat' }), 'week');
    expect(onUpdate).toHaveBeenCalledWith(1, { recurrence: { every: 'week', interval: 1 } });
  });

  it('changes how often a task repeats', async () => {
    const { onUpdate } = setup({ recurrence: { every: 'month', interval: 1 } });
    await openDetails();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Repeat every how many' }), { target: { value: '3' } });
    expect(onUpdate).toHaveBeenCalledWith(1, { recurrence: { every: 'month', interval: 3 } });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Repeat' }), 'Never');
    expect(onUpdate).toHaveBeenLastCalledWith(1, { recurrence: null });
  });
});

describe('TaskItem tags and repeat', () => {
  it('shows them under the text, and a tag filters the list to it', async () => {
    const onFilterTag = vi.fn();
    render(
      <table>
        <tbody>
          <TaskItem
            task={{ ...task, tags: ['home'], recurrence: { every: 'week', interval: 2 } }}
            today="2026-11-07"
            onFilterTag={onFilterTag}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('Every 2 weeks')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show tasks tagged home' }));
    expect(onFilterTag).toHaveBeenCalledWith('home');
  });
});

describe('TaskItem due date keys', () => {
  it('moves the date a day with the arrow keys, starts from today, and clears with Delete', async () => {
    const { onUpdate } = setup({ dueDate: '2026-11-08' });
    screen.getByRole('button', { name: /^Due date: Write tests/ }).focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onUpdate).toHaveBeenLastCalledWith(1, { dueDate: '2026-11-09' });
    await userEvent.keyboard('{ArrowDown}');
    expect(onUpdate).toHaveBeenLastCalledWith(1, { dueDate: '2026-11-07' });
    await userEvent.keyboard('{Delete}');
    expect(onUpdate).toHaveBeenLastCalledWith(1, { dueDate: null });
  });

  it('carries the task when dragged, so the Calendar can take it', () => {
    setup();
    const setData = vi.fn();
    fireEvent.dragStart(screen.getByRole('button', { name: 'Reorder task: Write tests' }), {
      dataTransfer: { setData, setDragImage: () => {}, effectAllowed: '' },
    });
    expect(setData).toHaveBeenCalledWith('application/x-dashboard-task', '1');
  });
});
