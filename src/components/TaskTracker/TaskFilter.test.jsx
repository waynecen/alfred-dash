import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TaskFilter from './TaskFilter';

const NO_FILTER = { status: 'all', when: 'any', tag: '', query: '' };
const counts = { active: 3, completed: 1, overdue: 1, today: 2, upcoming: 0 };

function setup(filter = {}, tags = []) {
  const onChange = vi.fn();
  render(<TaskFilter filter={{ ...NO_FILTER, ...filter }} counts={counts} tags={tags} onChange={onChange} />);
  return onChange;
}

describe('TaskFilter', () => {
  it('shows counts for Active and Completed but not All', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Active3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completed1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
  });

  it('marks only the current filter as pressed', () => {
    setup({ status: 'active' });
    expect(screen.getByRole('button', { name: 'Active3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the clicked status', async () => {
    const onChange = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Completed1' }));
    expect(onChange).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('picks a due filter, and pressing it again goes back to any date', async () => {
    const onChange = setup({ when: 'today' });
    expect(screen.getByRole('button', { name: 'Overdue1' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Today2' }));
    expect(onChange).toHaveBeenCalledWith({ when: 'any' });
    await userEvent.click(screen.getByRole('button', { name: 'Overdue1' }));
    expect(onChange).toHaveBeenLastCalledWith({ when: 'overdue' });
  });

  it('searches as you type', async () => {
    const onChange = setup();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'r');
    expect(onChange).toHaveBeenCalledWith({ query: 'r' });
  });

  it('offers the tags in use, and only when there are some', async () => {
    setup();
    expect(screen.queryByRole('combobox', { name: 'Filter by tag' })).not.toBeInTheDocument();
  });

  it('filters by a tag', async () => {
    const onChange = setup({}, [{ tag: 'home', count: 2 }]);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by tag' }), '#home (2)');
    expect(onChange).toHaveBeenCalledWith({ tag: 'home' });
  });
});
