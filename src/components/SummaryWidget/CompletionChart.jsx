import { useState } from 'react';
import { formatDay } from '../../utils/dates';

// A count for each day, as columns on one baseline: tasks done in the last week for the Summary,
// focus minutes for the weekly review. One series in ink: the other days in graphite, the current
// one (today) in full ink. Pointing at a column (or focusing the chart and using the arrow keys)
// reads that day out above it; a hidden table holds every value too.
//   days: [{ date: 'YYYY-MM-DD', count }], oldest first
//   title: the caption over the chart    unit: the word after a day's count ('done', 'min')
//   label: what is counted, for screen readers and the table
//   current: which day is set in full ink, by index (the last, today, unless said otherwise)
//   summary: the readout while no day is picked (the total, unless said otherwise)
function CompletionChart({
  days,
  title = 'Done, last 7 days',
  unit = 'done',
  label = 'Tasks done each day',
  current = days.length - 1,
  summary,
}) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const shown = active === null ? null : days[active];
  const readout = shown
    ? `${formatDay(shown.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${shown.count} ${unit}`
    : (summary ?? `${total} in ${days.length} days`);

  function handleKeyDown(event) {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : days.length - 1);
    } else if (step) {
      event.preventDefault();
      setActive((picked) => Math.min(days.length - 1, Math.max(0, (picked ?? current) + step)));
    }
  }

  return (
    <figure className="completion">
      <figcaption className="completion-head">
        <span className="completion-title label">{title}</span>
        <span className="completion-readout" aria-live="polite">
          {readout}
        </span>
      </figcaption>
      <div
        className="completion-chart"
        role="group"
        tabIndex={0}
        aria-label={`${label}. Use the left and right arrow keys to read each day.`}
        onKeyDown={handleKeyDown}
        onFocus={() => setActive((picked) => picked ?? current)}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        {days.map((day, index) => (
          // The whole column is the hit target, not just the bar, so short bars are easy to point at.
          <div
            key={day.date}
            className="completion-col"
            data-today={index === current || undefined}
            data-active={index === active || undefined}
            onPointerEnter={() => setActive(index)}
            aria-hidden="true"
          >
            <span className="completion-track">
              {day.count > 0 && <span className="completion-bar" style={{ height: `${(day.count / max) * 100}%` }} />}
            </span>
            <span className="completion-day">{formatDay(day.date, { weekday: 'narrow' })}</span>
          </div>
        ))}
      </div>
      <table className="visually-hidden">
        <caption>
          {label}, {title.toLowerCase()}
        </caption>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{formatDay(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}</th>
              <td>{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default CompletionChart;
