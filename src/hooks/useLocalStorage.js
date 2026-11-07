import { useCallback, useRef, useSyncExternalStore } from 'react';

// Works like useState, but the value is also saved in the browser's localStorage, and every
// component using the same key sees the same value: a change in one (or in another tab) shows
// up in all of them. It works for any value that can be turned into JSON.

// The last value parsed for each key, with the stored text it came from. Reading checks the text
// first, so a value is only parsed again when storage has really changed (and a component
// re-rendering gets the very same object back, as React requires).
const cache = new Map(); // key -> { raw, value }
const listeners = new Map(); // key -> Set of callbacks

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage blocked
  }
}

function read(key, initialValue) {
  const raw = readRaw(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  let value = initialValue;
  if (raw !== null) {
    try {
      value = JSON.parse(raw);
    } catch {
      // Bad JSON: fall back to the default instead of crashing.
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or disabled; the app still works, it just won't persist.
  }
  // Tie the new value to whatever storage now holds. If the write failed, that is the old text,
  // so the value lives on in memory until storage really changes.
  cache.set(key, { raw: readRaw(key), value });
  emit(key);
}

function emit(key) {
  const keys = key === null ? [...listeners.keys()] : [key];
  for (const k of keys) listeners.get(k)?.forEach((callback) => callback());
}

function subscribe(key, callback) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(callback);
  return () => listeners.get(key)?.delete(callback);
}

// Another tab saved something (key is null when it cleared storage).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // sessionStorage changes fire this too; they aren't ours.
    if (event.storageArea && event.storageArea !== localStorage) return;
    emit(event.key);
  });
}

// Tells every component to re-read storage, after something wrote to it directly
// (restoring a backup, clearing all data).
export function refreshStorage() {
  emit(null);
}

function useLocalStorage(key, initialValue) {
  // The default only matters the first time a key is read, so a new [] each render is fine.
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;

  const value = useSyncExternalStore(
    useCallback((callback) => subscribe(key, callback), [key]),
    () => read(key, initialRef.current)
  );

  // Like useState's setter: takes a value, or a function from the current value to the next.
  // Functions always see the latest value, even when several updates run in one event.
  const setValue = useCallback(
    (next) => {
      const current = read(key, initialRef.current);
      write(key, typeof next === 'function' ? next(current) : next);
    },
    [key]
  );

  return [value, setValue];
}

export default useLocalStorage;
