import { useState } from 'react';
import { parseISODate } from '../../utils/dates';

const dayLabel = (iso, options) => parseISODate(iso).toLocaleDateString(undefined, options);

// Tasks done each day for the last week, as seven columns on one baseline. One series in ink:
// earlier days in graphite, today in full ink. Pointing at a column (or focusing the chart and
// using the arrow keys) reads that day out above it; a hidden table holds every value too.
//   days: [{ date: 'YYYY-MM-DD', count }], oldest first, ending today
function CompletionChart({ days }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const shown = active === null ? null : days[active];
  const readout = shown
    ? `${dayLabel(shown.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${shown.count} done`
    : `${total} in 7 days`;

  function handleKeyDown(event) {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : days.length - 1);
    } else if (step) {
      event.preventDefault();
      setActive((current) => Math.min(days.length - 1, Math.max(0, (current ?? days.length - 1) + step)));
    }
  }

  return (
    <figure className="completion">
      <figcaption className="completion-head">
        <span className="completion-title">Done, last 7 days</span>
        <span className="completion-readout" aria-live="polite">
          {readout}
        </span>
      </figcaption>
      <div
        className="completion-chart"
        role="group"
        tabIndex={0}
        aria-label="Tasks done each day. Use the left and right arrow keys to read each day."
        onKeyDown={handleKeyDown}
        onFocus={() => setActive((current) => current ?? days.length - 1)}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        {days.map((day, index) => (
          // The whole column is the hit target, not just the bar, so short bars are easy to point at.
          <div
            key={day.date}
            className="completion-col"
            data-today={index === days.length - 1 || undefined}
            data-active={index === active || undefined}
            onPointerEnter={() => setActive(index)}
            aria-hidden="true"
          >
            <span className="completion-track">
              {day.count > 0 && <span className="completion-bar" style={{ height: `${(day.count / max) * 100}%` }} />}
            </span>
            <span className="completion-day">{dayLabel(day.date, { weekday: 'narrow' })}</span>
          </div>
        ))}
      </div>
      <table className="visually-hidden">
        <caption>Tasks done each day, last 7 days</caption>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{dayLabel(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}</th>
              <td>{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default CompletionChart;
