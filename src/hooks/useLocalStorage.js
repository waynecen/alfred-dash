import { useState, useEffect } from 'react';

// Works like useState, but the value is also saved in the browser's localStorage.
// It's generic: it works for any value that can be turned into JSON.
function useLocalStorage(key, initialValue) {
  // Passing a function to useState means it only runs once, on the first render.
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      // If something was saved, turn the text back into a value. Otherwise use the default.
      return saved !== null ? JSON.parse(saved) : initialValue;
    } catch {
      // Bad JSON or storage blocked: fall back to the default instead of crashing.
      return initialValue;
    }
  });

  // Save whenever the value (or key) changes.
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be full or disabled; the app still works, it just won't persist.
    }
  }, [key, value]);

  return [value, setValue];
}

export default useLocalStorage;
