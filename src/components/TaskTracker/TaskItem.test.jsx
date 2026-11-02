import { render, screen } from '@testing-library/react';
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
  };
  render(
    <ul>
      <TaskItem task={{ ...task, ...overrides }} {...handlers} />
    </ul>
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
