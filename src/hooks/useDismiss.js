import { useEffect, useRef } from 'react';

// Closes a popup, menu or dialog when the user presses Escape or clicks outside it.
//   ref: the element that counts as "inside"
//   onClose(reason): reason is 'escape' or 'outside', so callers can decide where focus goes
//   active: only listens while true (e.g. while the menu is open)
function useDismiss(ref, onClose, active = true) {
  // Kept in a ref so a new onClose each render does not re-add the listeners.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!active) return undefined;

    function handleMouseDown(event) {
      // Clicks on toasts (e.g. Undo) never count as "outside": they float above everything.
      if (event.target.closest?.('[data-keep-overlays]')) return;
      if (ref.current && !ref.current.contains(event.target)) close.current('outside');
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') close.current('escape');
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, active]);
}

export default useDismiss;
