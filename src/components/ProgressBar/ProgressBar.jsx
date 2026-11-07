import './ProgressBar.css';

// How far along something is: a hairline track with a solid ink fill. Used by the Summary for
// tasks done and by the Goals widget for each goal.
//   value, max: the fill is value / max, never past full
//   label: what it measures, for screen readers ("Tasks completed")
//   valueText: how the value reads aloud, when a bare number isn't enough ("5 of 12 books")
//   className: for the caller's own sizing
function ProgressBar({ value, max = 100, label, valueText, className }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={['progress', className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-valuetext={valueText}
    >
      <div className="progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

export default ProgressBar;
