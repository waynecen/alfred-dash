import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import WidgetState from './WidgetState';

describe('WidgetState', () => {
  it('announces loading politely and marks itself busy', () => {
    render(<WidgetState status="loading" message="Loading forecast…" />);
    const state = screen.getByRole('status');
    expect(state).toHaveTextContent('Loading forecast…');
    expect(state).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an empty state with its own actions', () => {
    render(
      <WidgetState status="empty" message="Nothing here yet.">
        <button type="button">Add one</button>
      </WidgetState>
    );
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-busy');
    expect(screen.getByRole('button', { name: 'Add one' })).toBeInTheDocument();
  });

  it('raises errors as an alert with a Retry button', async () => {
    const onRetry = vi.fn();
    render(<WidgetState status="error" message="Could not load." onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('has no Retry button when there is nothing to retry', () => {
    render(<WidgetState status="error" message="Broken." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
