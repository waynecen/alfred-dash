import './SummaryWidget.css';

// The content of the Summary widget. The card and title come from <Widget>.
function SummaryWidget({ active, completed }) {
  const total = active + completed;
  // Avoid dividing by zero when there are no tasks yet.
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="summary-widget">
      <dl className="summary-stats">
        <div className="summary-stat">
          <dt>Active</dt>
          <dd>{active}</dd>
        </div>
        <div className="summary-stat">
          <dt>Completed</dt>
          <dd>{completed}</dd>
        </div>
      </dl>
      <div className="summary-progress-row">
        <div
          className="summary-progress"
          role="progressbar"
          aria-label="Tasks completed"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="summary-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <p className="summary-caption">
          {completed} of {total} done ({percent}%)
        </p>
      </div>
    </div>
  );
}

export default SummaryWidget;
