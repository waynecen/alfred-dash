import './SummaryWidget.css';

function SummaryWidget({ active, completed }) {
  const total = active + completed;
  // Avoid dividing by zero when there are no tasks yet.
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <section className="summary-widget" aria-labelledby="summary-heading">
      <header className="summary-header">
        <h2 id="summary-heading">Summary</h2>
        <p className="summary-caption">
          {completed} of {total} done ({percent}%)
        </p>
      </header>
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
    </section>
  );
}

export default SummaryWidget;
