import { render, screen, within } from '@testing-library/react';
import SummaryWidget from './SummaryWidget';

describe('SummaryWidget', () => {
  it('shows active and completed counts with the percentage done', () => {
    render(<SummaryWidget active={3} completed={1} />);
    expect(screen.getByText('Active').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Completed').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('1 of 4 done (25%)')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });

  it('shows how many open tasks there are at each priority', () => {
    render(<SummaryWidget active={4} completed={0} openByPriority={{ high: 2, medium: 1, low: 1 }} />);
    const items = within(screen.getByRole('list', { name: 'Open tasks by priority' })).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['2 high open', '1 medium open', '1 low open']);
  });

  it('shows zero for priorities with nothing open', () => {
    render(<SummaryWidget active={0} completed={0} />);
    const list = screen.getByRole('list', { name: 'Open tasks by priority' });
    expect(list).toHaveTextContent('0 high open');
    expect(list).toHaveTextContent('0 medium open');
    expect(list).toHaveTextContent('0 low open');
  });

  it('only colours priorities that have open tasks', () => {
    render(<SummaryWidget active={1} completed={0} openByPriority={{ high: 1, medium: 0, low: 0 }} />);
    const [high, medium] = screen.getAllByRole('listitem');
    expect(high).toHaveClass('summary-priority-high');
    expect(medium).not.toHaveClass('summary-priority-medium');
  });

  it('shows 0% instead of dividing by zero when there are no tasks', () => {
    render(<SummaryWidget active={0} completed={0} />);
    expect(screen.getByText('0 of 0 done (0%)')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('reaches 100% when everything is complete', () => {
    render(<SummaryWidget active={0} completed={2} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
