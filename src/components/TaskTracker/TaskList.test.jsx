import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TaskList from './TaskList';

function setup(props = {}) {
  const handlers = {
    onSort: vi.fn(),
    onToggle: vi.fn(),
    onEdit: vi.fn(),
    onPriorityChange: vi.fn(),
    onDelete: vi.fn(),
  };
  render(<TaskList tasks={[]} totalCount={0} sort={null} {...handlers} {...props} />);
  return handlers;
}

const tasks = [
  { id: 1, text: 'One', completed: false, priority: 'low' },
  { id: 2, text: 'Two', completed: true, priority: 'high' },
];

describe('TaskList', () => {
  it('labels every column', () => {
    setup();
    for (const name of ['Done', 'Description', 'Priority', 'Created', 'Actions']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it('shows a prompt when there are no tasks at all', () => {
    setup({ tasks: [], totalCount: 0 });
    expect(screen.getByText('No tasks yet. Add one above!')).toBeInTheDocument();
  });

  it('says nothing matches when tasks exist but are all filtered out', () => {
    setup({ tasks: [], totalCount: 3 });
    expect(screen.getByText('No tasks match this filter.')).toBeInTheDocument();
  });

  it('renders one row per task, plus the header row', () => {
    setup({ tasks, totalCount: 2 });
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Two' })).toBeInTheDocument();
  });

  it('has no filter inputs in the header', () => {
    setup({ tasks, totalCount: 2 });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Filter by/)).not.toBeInTheDocument();
  });

  describe('sort buttons', () => {
    it('sit beside Description, Priority and Created only', () => {
      setup();
      expect(screen.getByRole('button', { name: 'Sort by description' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sort by priority' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sort by created' })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /^Sort by/ })).toHaveLength(3);
    });

    it('report the clicked column', async () => {
      const { onSort } = setup();
      await userEvent.click(screen.getByRole('button', { name: 'Sort by priority' }));
      expect(onSort).toHaveBeenCalledWith('priority');
    });

    it('show the current sort on the heading only', () => {
      setup({ sort: { key: 'priority', direction: 'desc' } });
      expect(screen.getByRole('columnheader', { name: /Priority/ })).toHaveAttribute('aria-sort', 'descending');
      expect(screen.getByRole('columnheader', { name: /Description/ })).toHaveAttribute('aria-sort', 'none');
      expect(screen.getByRole('columnheader', { name: /Created/ })).toHaveAttribute('aria-sort', 'none');
    });

    it('show an ascending sort', () => {
      setup({ sort: { key: 'created', direction: 'asc' } });
      expect(screen.getByRole('columnheader', { name: /Created/ })).toHaveAttribute('aria-sort', 'ascending');
    });
  });
});
