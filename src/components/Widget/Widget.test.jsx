import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Widget from './Widget';

describe('Widget', () => {
  it('shows the title and its content in a labelled region', () => {
    render(
      <Widget title="Notes" onRemove={() => {}}>
        <p>Hello</p>
      </Widget>
    );
    expect(screen.getByRole('region', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('calls onRemove from the labelled remove button', async () => {
    const onRemove = vi.fn();
    render(<Widget title="Notes" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Notes widget' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('only takes a whole row when wide', () => {
    const { rerender } = render(<Widget title="A" onRemove={() => {}} />);
    expect(screen.getByRole('region')).not.toHaveClass('widget-wide');
    rerender(<Widget title="A" wide onRemove={() => {}} />);
    expect(screen.getByRole('region')).toHaveClass('widget-wide');
  });
});
