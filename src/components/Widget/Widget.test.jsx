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

  it('places the card on the grid by its span', () => {
    render(<Widget title="A" span={6} onRemove={() => {}} />);
    expect(screen.getByRole('region')).toHaveAttribute('data-span', '6');
  });

  it('resizes one column at a time with the arrow keys, within the limits', async () => {
    const onResize = vi.fn();
    render(<Widget title="A" span={12} onRemove={() => {}} onResize={onResize} />);
    screen.getByRole('button', { name: 'Resize A widget' }).focus();
    await userEvent.keyboard('{ArrowRight}{ArrowLeft}');
    expect(onResize).toHaveBeenNthCalledWith(1, 12);
    expect(onResize).toHaveBeenNthCalledWith(2, 11);
  });

  it('steps to a neighbour with the arrow keys on the move handle', async () => {
    const onStep = vi.fn();
    render(<Widget title="A" onRemove={() => {}} onStep={onStep} />);
    screen.getByRole('button', { name: 'Move A widget' }).focus();
    await userEvent.keyboard('{ArrowDown}{ArrowLeft}');
    expect(onStep).toHaveBeenNthCalledWith(1, 1);
    expect(onStep).toHaveBeenNthCalledWith(2, -1);
  });

  it('has no resize handle unless it can be resized', () => {
    render(<Widget title="A" onRemove={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Resize A widget' })).not.toBeInTheDocument();
  });
});
