import { render, screen } from '@testing-library/react';
import SummaryWidget from './SummaryWidget';

describe('SummaryWidget', () => {
  it('shows active and completed counts with the percentage done', () => {
    render(<SummaryWidget active={3} completed={1} />);
    expect(screen.getByText('Active').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Completed').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('1 of 4 done (25%)')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
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
