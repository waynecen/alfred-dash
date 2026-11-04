import { useCallback, useRef, useState } from 'react';

// The most toasts shown at once; a new one pushes out the oldest.
export const MAX_TOASTS = 3;

// Short messages that confirm what just happened, each with an optional action such as Undo.
// Destructive actions happen at once and offer Undo here, instead of asking "Are you sure?" first.
//   notify({ message, actionLabel, onAction }) shows one and returns its id
//   dismiss(id) hides it (the toast also hides itself after a few seconds)
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const notify = useCallback(({ message, actionLabel, onAction }) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, actionLabel, onAction }].slice(-MAX_TOASTS));
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, notify, dismiss };
}

export default useToasts;
