import { useState } from 'react';
import { addDays, formatDay, startOfWeek } from '../../utils/dates';
import { dayTally } from '../../utils/streaks';
import { weekOrder, weekdayName } from '../../data/habits';

const WEEKS = 12;
const LEVELS = [0, 1, 2, 3, 4];

// How full a day was, for its shade: null when nothing was due, 0 when nothing due was done, then
// 1 to 4 in quarters up to everything done.
export function levelOf({ due, done }) {
  if (!due) return null;
  if (!done) return 0;
  return Math.max(1, Math.ceil((done / due) * 4));
}

// The last twelve weeks of habits as a grid of days: one column a week, one row a weekday, each
// day shaded in ink by the share of the habits due that day that were done (one hue, light to
// dark). Pointing at a day, or focusing the grid and using the arrow keys, reads it out above; a
// hidden table gives each week's totals.
//   habits: the habits to count    log: { [habitId]: days done }
//   today: 'YYYY-MM-DD'    weekStart: 1 for Monday, 0 for Sunday
function HabitHeatmap({ habits, log, today, weekStart }) {
  const [active, setActive] = useState(null);
  const first = startOfWeek(addDays(today, -7 * (WEEKS - 1)), weekStart);
  const weeks = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
  const tallies = new Map();
  for (const day of weeks.flat()) if (day <= today) tallies.set(day, dayTally(habits, log, day));

  const sum = (days) =>
    days.reduce((total, day) => {
      const tally = tallies.get(day);
      return tally ? { due: total.due + tally.due, done: total.done + tally.done } : total;
    }, { due: 0, done: 0 });
  const all = sum(weeks.flat());

  let readout = all.due ? `${Math.round((all.done / all.due) * 100)}% done in ${WEEKS} weeks` : 'Nothing due yet';
  if (active) {
    const tally = tallies.get(active);
    const when = formatDay(active, { weekday: 'short', day: 'numeric', month: 'short' });
    readout = `${when} · ${tally.due ? `${tally.done} of ${tally.due} done` : 'nothing due'}`;
  }

  function handleKeyDown(event) {
    const current = active ?? today;
    const step = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[event.key];
    let next = null;
    if (step) next = addDays(current, step);
    else if (event.key === 'Home') next = first;
    else if (event.key === 'End') next = today;
    if (!next) return;
    event.preventDefault();
    if (next >= first && next <= today) setActive(next);
  }

  return (
    <figure className="habit-heatmap">
      <figcaption className="habit-heatmap-head">
        <span className="habit-heatmap-title label">Last {WEEKS} weeks</span>
        <span className="habit-heatmap-readout" aria-live="polite">
          {readout}
        </span>
      </figcaption>
      <div
        className="habit-heatmap-grid"
        role="group"
        tabIndex={0}
        aria-label={`Habits done each day, last ${WEEKS} weeks. Use the arrow keys to read each day.`}
        onKeyDown={handleKeyDown}
        onFocus={() => setActive((current) => current ?? today)}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        {/* Month names over the week each month starts in. */}
        <span aria-hidden="true" />
        {weeks.map((week, w) => {
          const month = week[0].slice(5, 7);
          const starts = w === 0 || month !== weeks[w - 1][0].slice(5, 7);
          return (
            <span key={week[0]} className="habit-heatmap-month" aria-hidden="true">
              {starts ? formatDay(week[0], { month: 'short' }) : ''}
            </span>
          );
        })}
        {weekOrder(weekStart).map((weekday, row) => (
          <Row key={weekday} label={row % 2 === 0 ? weekdayName(weekday, 'narrow') : ''}>
            {weeks.map((week) => {
              const day = week[row];
              if (day > today) return <span key={day} className="habit-heatmap-cell is-future" aria-hidden="true" />;
              const level = levelOf(tallies.get(day));
              return (
                <span
                  key={day}
                  className="habit-heatmap-cell"
                  data-level={level ?? 'rest'}
                  data-active={day === active || undefined}
                  data-today={day === today || undefined}
                  onPointerEnter={() => setActive(day)}
                  aria-hidden="true"
                />
              );
            })}
          </Row>
        ))}
      </div>
      <div className="habit-heatmap-legend" aria-hidden="true">
        <span>Less</span>
        {LEVELS.map((level) => (
          <span key={level} className="habit-heatmap-cell" data-level={level} />
        ))}
        <span>More</span>
      </div>
      <table className="visually-hidden">
        <caption>Habits done each week, last {WEEKS} weeks</caption>
        <tbody>
          {weeks.map((week) => {
            const total = sum(week);
            return (
              <tr key={week[0]}>
                <th scope="row">Week of {formatDay(week[0], { day: 'numeric', month: 'long' })}</th>
                <td>{total.due ? `${total.done} of ${total.due} done` : 'Nothing due'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}

// One weekday's row: its label, then a day from each week. (The grid lays the cells out; this
// only keeps the label beside them.)
function Row({ label, children }) {
  return (
    <>
      <span className="habit-heatmap-weekday" aria-hidden="true">
        {label}
      </span>
      {children}
    </>
  );
}

export default HabitHeatmap;
