import { useEffect, useRef } from 'react';

// Text fields where a plain key press means typing, not a shortcut.
const NOT_TYPING = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file']);
function isTyping(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true;
  return target.tagName === 'INPUT' && !NOT_TYPING.has(target.type);
}

// Keyboard shortcuts for the whole page. bindings is a list of
//   { key, mod?, run(event) }
// key is compared with event.key ignoring case ('k', '?', '1'); mod: true means Ctrl (or Cmd on a
// Mac) must be held. Plain-key shortcuts stay quiet while the user is typing in a field or a
// dialog is open, so they never get in the way; mod shortcuts work everywhere.
function useShortcuts(bindings) {
  // Kept in a ref so new handlers each render don't re-add the listener.
  const current = useRef(bindings);
  current.current = bindings;

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.defaultPrevented || event.altKey || event.isComposing) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const binding = current.current.find((b) => b.key.toLowerCase() === key && Boolean(b.mod) === mod);
      if (!binding) return;
      if (!binding.mod && (isTyping(event.target) || document.querySelector('[aria-modal="true"]'))) return;
      event.preventDefault(); // e.g. so the "n" that focuses the task box isn't typed into it
      binding.run(event);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

export default useShortcuts;
