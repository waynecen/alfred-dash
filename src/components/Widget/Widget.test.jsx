import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(onResize).toHaveBeenNthCalledWith(1, { span: 12 });
    expect(onResize).toHaveBeenNthCalledWith(2, { span: 11 });
  });

  it('changes the height one row at a time with the up and down arrows', async () => {
    const onResize = vi.fn();
    render(<Widget title="A" rows={5} onRemove={() => {}} onResize={onResize} />);
    expect(screen.getByRole('region')).toHaveAttribute('data-rows', '5');
    screen.getByRole('button', { name: 'Resize A widget' }).focus();
    await userEvent.keyboard('{ArrowDown}{ArrowUp}');
    expect(onResize).toHaveBeenNthCalledWith(1, { rows: 6 });
    expect(onResize).toHaveBeenNthCalledWith(2, { rows: 4 });
  });

  it('goes back to automatic height on double-click', async () => {
    const onResize = vi.fn();
    render(<Widget title="A" rows={5} onRemove={() => {}} onResize={onResize} />);
    await userEvent.dblClick(screen.getByRole('button', { name: 'Resize A widget' }));
    expect(onResize).toHaveBeenLastCalledWith({ rows: null });
  });

  it('resizes from the right edge (width only) and the bottom edge (height only)', () => {
    const onResize = vi.fn();
    const { container } = render(<Widget title="A" onRemove={() => {}} onResize={onResize} />);
    const east = container.querySelector('.widget-edge-e');
    const south = container.querySelector('.widget-edge-s');

    fireEvent.pointerDown(east, { clientX: 100, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(east, { clientX: 400, clientY: 50, pointerId: 1 });
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(Object.keys(onResize.mock.calls[0][0])).toEqual(['span']);
    fireEvent.pointerUp(east, { pointerId: 1 });

    fireEvent.pointerDown(south, { clientX: 100, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(south, { clientX: 100, clientY: 400, pointerId: 1 });
    expect(Object.keys(onResize.mock.calls[1][0])).toEqual(['rows']);
  });

  it('shows a snap guide only while an edge is being dragged', () => {
    const { container } = render(<Widget title="A" onRemove={() => {}} onResize={() => {}} />);
    const east = container.querySelector('.widget-edge-e');
    expect(container.querySelector('.widget-snap-guide')).toBeNull();

    fireEvent.pointerDown(east, { clientX: 100, clientY: 50, pointerId: 1 });
    expect(container.querySelector('.widget-snap-guide')).not.toBeNull();
    expect(screen.getByRole('region')).toHaveClass('resizing');

    fireEvent.pointerUp(east, { pointerId: 1 });
    expect(container.querySelector('.widget-snap-guide')).toBeNull();
  });

  it('has no set height by default', () => {
    render(<Widget title="A" onRemove={() => {}} />);
    expect(screen.getByRole('region')).not.toHaveAttribute('data-rows');
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
