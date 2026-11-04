import './WidgetState.css';

// The message a widget shows instead of its content: nothing set up yet, still loading, or failed.
// Every widget that waits on something uses this, so the three cases look and sound the same
// everywhere.
//   status: 'empty' | 'loading' | 'error'
//   message: what is happening, in plain words
//   onRetry: for errors, shows a Retry button that calls it
//   children: optional actions, such as the button that fills an empty widget
//   className: extra classes, for widgets that tint their own text (e.g. Weather's white text)
function WidgetState({ status, message, onRetry, children, className }) {
  // Errors interrupt (role="alert"); loading and empty states are announced politely.
  const role = status === 'error' ? 'alert' : 'status';
  const classes = ['widget-state', `widget-state-${status}`, className].filter(Boolean).join(' ');

  return (
    <div className={classes} role={role} aria-busy={status === 'loading' || undefined}>
      {status === 'loading' && <span className="widget-state-spinner" aria-hidden="true" />}
      <p className="widget-state-message">{message}</p>
      {(onRetry || children) && (
        <div className="widget-state-actions">
          {onRetry && (
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

export default WidgetState;
