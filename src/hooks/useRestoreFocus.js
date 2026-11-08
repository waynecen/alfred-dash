import { useEffect, useRef } from 'react';

// Hands focus back to the control that opened something once it closes (an inline editor, say),
// so it isn't dropped onto the page and the keyboard user starts again from the top.
//   open: whether the thing is open    ref: the control to come back to
function useRestoreFocus(open, ref) {
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) ref.current?.focus();
    wasOpen.current = open;
  }, [open, ref]);
}

export default useRestoreFocus;
