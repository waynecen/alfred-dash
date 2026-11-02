import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TaskFilter from './TaskFilter';

describe('TaskFilter', () => {
  const counts = { active: 3, completed: 1 };

  it('shows counts for Active and Completed but not All', () => {
    render(<TaskFilter filter="all" counts={counts} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Active3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completed1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
  });

  it('marks only the current filter as pressed', () => {
    render(<TaskFilter filter="active" counts={counts} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Active3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked filter value', async () => {
    const onChange = vi.fn();
    render(<TaskFilter filter="all" counts={counts} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Completed1' }));
    expect(onChange).toHaveBeenCalledWith('completed');
  });
});
