import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TaskForm from './TaskForm';

describe('TaskForm', () => {
  it('adds a trimmed task with the default medium priority and clears the input', async () => {
    const onAdd = vi.fn();
    render(<TaskForm onAdd={onAdd} />);
    const input = screen.getByLabelText('New task');

    await userEvent.type(input, '  Buy milk  ');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledWith('Buy milk', 'medium');
    expect(input).toHaveValue('');
  });

  it('submits with Enter', async () => {
    const onAdd = vi.fn();
    render(<TaskForm onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText('New task'), 'Walk dog{Enter}');
    expect(onAdd).toHaveBeenCalledWith('Walk dog', 'medium');
  });

  it('ignores empty and spaces-only input', async () => {
    const onAdd = vi.fn();
    render(<TaskForm onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.type(screen.getByLabelText('New task'), '   {Enter}');
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('passes the selected priority', async () => {
    const onAdd = vi.fn();
    render(<TaskForm onAdd={onAdd} />);
    await userEvent.selectOptions(screen.getByLabelText('Priority'), 'high');
    await userEvent.type(screen.getByLabelText('New task'), 'Urgent{Enter}');
    expect(onAdd).toHaveBeenCalledWith('Urgent', 'high');
  });
});
