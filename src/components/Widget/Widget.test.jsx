import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Widget from './Widget';

const position = { x: 2, y: 1, w: 4, h: 3 };

function setup(props = {}) {
  const handlers = {
    onRemove: vi.fn(),
    onMoveStart: vi.fn(),
    onResizeStart: vi.fn(),
    onNudge: vi.fn(),
    onStretch: vi.fn(),
  };
  const view = render(
    <Widget title="Notes" position={position} {...handlers} {...props}>
      <p>Hello</p>
    </Widget>
  );
  return { ...handlers, ...view };
}

describe('Widget', () => {
  it('shows the title and its content in a labelled region', () => {
    setup();
    expect(screen.getByRole('region', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('calls onRemove from the labelled remove button', async () => {
    const { onRemove } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Notes widget' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('sits on the grid cells it is given (the grid counts from 1)', () => {
    setup();
    const card = screen.getByRole('region');
    expect(card.style.gridColumn).toBe('3 / span 4');
    expect(card.style.gridRow).toBe('2 / span 3');
  });

  it('moves one cell at a time with the arrow keys on the handle', async () => {
    const { onNudge } = setup();
    screen.getByRole('button', { name: 'Move Notes widget' }).focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowDown}{ArrowRight}{ArrowUp}');
    expect(onNudge.mock.calls).toEqual([[-1, 0], [0, 1], [1, 0], [0, -1]]);
  });

  it('resizes one cell at a time: left and right change the width, up and down the height', async () => {
    const { onStretch } = setup();
    screen.getByRole('button', { name: 'Resize Notes widget' }).focus();
    await userEvent.keyboard('{ArrowRight}{ArrowLeft}{ArrowDown}{ArrowUp}');
    expect(onStretch.mock.calls).toEqual([[1, 0], [-1, 0], [0, 1], [0, -1]]);
  });

  it('reports a press on the handle and on each resize edge', () => {
    const { onMoveStart, onResizeStart, container } = setup();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Move Notes widget' }));
    expect(onMoveStart).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(container.querySelector('.widget-edge-e'));
    fireEvent.pointerDown(container.querySelector('.widget-edge-s'));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Resize Notes widget' }));
    expect(onResizeStart.mock.calls.map(([, edge]) => edge)).toEqual(['e', 's', 'se']);
  });

  it('has no resize edges unless it can be resized', () => {
    const { container } = setup({ onResizeStart: undefined });
    expect(container.querySelector('.widget-edge')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Resize Notes widget' })).not.toBeInTheDocument();
  });

  it('floats and follows the pointer while it is being moved', () => {
    setup({ state: 'moving', shift: { x: 12, y: -8 } });
    const card = screen.getByRole('region');
    expect(card).toHaveClass('is-moving');
    expect(card.style.transform).toBe('translate(12px, -8px)');
  });

  it('is not offset when it is only being resized', () => {
    setup({ state: 'resizing', shift: { x: 12, y: -8 } });
    const card = screen.getByRole('region');
    expect(card).toHaveClass('is-resizing');
    expect(card.style.transform).toBe('');
  });
});
