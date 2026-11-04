import { useEffect } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// For modal dialogs: while mounted, Tab and Shift+Tab cycle inside the element instead of
// wandering onto the page behind it. On mount it focuses the element marked data-autofocus
// (or the first focusable one); on unmount it puts focus back where it was before.
function useFocusTrap(ref) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return undefined;
    const previous = document.activeElement;

    const focusable = () => [...container.querySelectorAll(FOCUSABLE)];
    (container.querySelector('[data-autofocus]') ?? focusable()[0] ?? container).focus();

    function handleKeyDown(event) {
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Only if it is still on the page; a removed element cannot take focus.
      if (previous && previous.isConnected) previous.focus();
    };
  }, [ref]);
}

export default useFocusTrap;
