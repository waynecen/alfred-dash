import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TaskForm from './TaskForm';

// What quick-add passes along when the text has no dates, tags or repeats in it.
const NOTHING_PARSED = { dueDate: null, tags: [], recurrence: null };

describe('TaskForm', () => {
  it('adds a trimmed task with the default medium priority and clears the input', async () => {
    const onAdd = vi.fn();
    render(<TaskForm onAdd={onAdd} />);
    const input = screen.getByLabelText('New task');

    await userEvent.type(input, '  Buy milk  ');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledWith('Buy milk', 'medium', NOTHING_PARSED);
    expect(input).toHaveValue('');
  });

  it('submits with Enter', async () => {
    const onAdd = vi.fn();
    render(<TaskForm onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText('New task'), 'Walk dog{Enter}');
    expect(onAdd).toHaveBeenCalledWith('Walk dog', 'medium', NOTHING_PARSED);
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
    expect(onAdd).toHaveBeenCalledWith('Urgent', 'high', NOTHING_PARSED);
  });

  it('reads tags and a typed priority out of the text, and shows what it read', async () => {
    const onAdd = vi.fn();
    render(<TaskForm onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText('New task'), 'Pay rent !high #home');
    expect(screen.getByText('#home')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(onAdd).toHaveBeenCalledWith('Pay rent', 'high', { dueDate: null, tags: ['home'], recurrence: null });
  });
});
