import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TaskList from './TaskList';

const noop = vi.fn();
const handlers = { onToggle: noop, onEdit: noop, onPriorityChange: noop, onDelete: noop };

describe('TaskList', () => {
  it('shows a prompt when there are no tasks at all', () => {
    render(<TaskList tasks={[]} filter="all" {...handlers} />);
    expect(screen.getByText('No tasks yet. Add one above!')).toBeInTheDocument();
  });

  it('names the filter when a filtered list is empty', () => {
    render(<TaskList tasks={[]} filter="completed" {...handlers} />);
    expect(screen.getByText('No completed tasks.')).toBeInTheDocument();
  });

  it('renders one item per task', () => {
    const tasks = [
      { id: 1, text: 'One', completed: false, priority: 'low' },
      { id: 2, text: 'Two', completed: true, priority: 'high' },
    ];
    render(<TaskList tasks={tasks} filter="all" {...handlers} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Two' })).toBeInTheDocument();
  });
});
