import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ToastRegion, { TOAST_DURATION } from './ToastRegion';
import useToasts, { MAX_TOASTS } from '../../hooks/useToasts';

function setup(toasts) {
  const onDismiss = vi.fn();
  render(<ToastRegion toasts={toasts} onDismiss={onDismiss} />);
  return onDismiss;
}

describe('ToastRegion', () => {
  afterEach(() => vi.useRealTimers());

  it('is a polite live region, present even when empty', () => {
    setup([]);
    expect(screen.getByRole('region', { name: 'Notifications' })).toHaveAttribute('aria-live', 'polite');
  });

  it('runs the action and dismisses the toast', () => {
    const onAction = vi.fn();
    const onDismiss = setup([{ id: 1, message: 'Notes removed', actionLabel: 'Undo', onAction }]);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledWith(1);
  });

  it('dismisses itself after a few seconds, but waits while hovered', () => {
    vi.useFakeTimers();
    const onDismiss = setup([{ id: 7, message: 'Saved' }]);
    const toast = screen.getByText('Saved').closest('.toast');

    act(() => vi.advanceTimersByTime(TOAST_DURATION - 1000));
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(TOAST_DURATION * 2));
    expect(onDismiss).not.toHaveBeenCalled();

    // Only the time that was left runs once the pointer leaves.
    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledWith(7);
  });

  it('has a close button', () => {
    const onDismiss = setup([{ id: 2, message: 'Saved' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(onDismiss).toHaveBeenCalledWith(2);
  });
});

describe('useToasts', () => {
  it('keeps only the newest few toasts', () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      for (let i = 1; i <= MAX_TOASTS + 2; i++) result.current.notify({ message: `Toast ${i}` });
    });
    expect(result.current.toasts.map((toast) => toast.message)).toEqual(['Toast 3', 'Toast 4', 'Toast 5']);
  });

  it('dismisses a toast by id', () => {
    const { result } = renderHook(() => useToasts());
    let id;
    act(() => {
      id = result.current.notify({ message: 'One' });
      result.current.notify({ message: 'Two' });
    });
    act(() => result.current.dismiss(id));
    expect(result.current.toasts.map((toast) => toast.message)).toEqual(['Two']);
  });
});
