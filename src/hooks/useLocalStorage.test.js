import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import useLocalStorage from './useLocalStorage';

describe('useLocalStorage', () => {
  it('returns the initial value when nothing is saved', () => {
    const { result } = renderHook(() => useLocalStorage('key', ['a']));
    expect(result.current[0]).toEqual(['a']);
  });

  it('reads a previously saved value', () => {
    localStorage.setItem('key', JSON.stringify({ n: 1 }));
    const { result } = renderHook(() => useLocalStorage('key', null));
    expect(result.current[0]).toEqual({ n: 1 });
  });

  it('saves updates to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('key', 0));
    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    expect(JSON.parse(localStorage.getItem('key'))).toBe(5);
  });

  it('falls back to the initial value when saved JSON is invalid', () => {
    localStorage.setItem('key', '{not json');
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('keeps every component using a key in step', () => {
    const first = renderHook(() => useLocalStorage('shared', 0));
    const second = renderHook(() => useLocalStorage('shared', 0));
    act(() => first.result.current[1](3));
    expect(second.result.current[0]).toBe(3);
  });

  it('gives functional updates the latest value, even in one event', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    act(() => {
      result.current[1]((n) => n + 1);
      result.current[1]((n) => n + 1);
    });
    expect(result.current[0]).toBe(2);
  });

  it('picks up changes made in another tab', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'a'));
    act(() => {
      localStorage.setItem('key', JSON.stringify('b'));
      window.dispatchEvent(new StorageEvent('storage', { key: 'key' }));
    });
    expect(result.current[0]).toBe('b');
  });

  it('keeps working when storage throws on write', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    const { result } = renderHook(() => useLocalStorage('key', 1));
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    spy.mockRestore();
  });
});
