import { useEffect, useRef, useState } from 'react';
import './Toast.css';

// How long a toast stays up. It waits while the pointer is over it or it has keyboard focus,
// so nobody loses an Undo while reaching for it (WCAG 2.2.1).
export const TOAST_DURATION = 6000;

// The corner where toasts appear. The live region is always on the page, so screen readers
// announce each new message as it is added.
//   toasts: [{ id, message, actionLabel?, onAction? }]   onDismiss(id)
function ToastRegion({ toasts, onDismiss }) {
  return (
    <div
      className="toast-region"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      data-keep-overlays // clicking Undo does not close an open menu or drawer
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(TOAST_DURATION);

  useEffect(() => {
    if (paused) return undefined;
    const started = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [paused, toast.id, onDismiss]);

  function runAction() {
    onDismiss(toast.id);
    toast.onAction();
  }

  return (
    <div
      className="toast"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className="toast-message">{toast.message}</p>
      {toast.onAction && (
        <button type="button" className="toast-action" onClick={runAction}>
          {toast.actionLabel ?? 'Undo'}
        </button>
      )}
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
}

export default ToastRegion;
