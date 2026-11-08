import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import useCollection from './useCollection';

function setup() {
  const notify = vi.fn();
  const hook = renderHook(() => useCollection('things', notify, (thing) => thing.name));
  return { notify, hook, current: () => hook.result.current };
}

describe('useCollection', () => {
  it('adds records with ids that never repeat, even in the same millisecond', () => {
    const { current } = setup();
    let first;
    let second;
    act(() => {
      first = current().add((id) => ({ id, name: 'One' }));
      second = current().add((id) => ({ id, name: 'Two' }));
    });
    expect(second).toBeGreaterThan(first);
    expect(current().items.map((thing) => thing.name)).toEqual(['One', 'Two']);
  });

  it('changes a record by fields or by a function of it', () => {
    const { current } = setup();
    let id;
    act(() => {
      id = current().add((newId) => ({ id: newId, name: 'One', count: 1 }));
    });
    act(() => current().update(id, { name: 'Uno' }));
    act(() => current().update(id, (thing) => ({ count: thing.count + 1 })));
    expect(current().items[0]).toMatchObject({ name: 'Uno', count: 2 });
  });

  it('deletes with Undo, which puts the record back where it was', () => {
    const { current, notify } = setup();
    const ids = [];
    act(() => {
      ids.push(current().add((id) => ({ id, name: 'One' })));
      ids.push(current().add((id) => ({ id, name: 'Two' })));
    });
    const onUndo = vi.fn();
    act(() => void current().remove(ids[0], { onUndo }));
    expect(current().items.map((thing) => thing.name)).toEqual(['Two']);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'Deleted “One”', actionLabel: 'Undo' }));
    act(() => notify.mock.calls[0][0].onAction());
    expect(current().items.map((thing) => thing.name)).toEqual(['One', 'Two']);
    expect(onUndo).toHaveBeenCalled();
    expect(current().remove(12345)).toBeNull();
  });
});
