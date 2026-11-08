import ProgressBar from '../ProgressBar/ProgressBar';
import useToday from '../../hooks/useToday';
import useSettings from '../../hooks/useSettings';
import { countDue } from '../../utils/countTasks';
import { completedThisWeek, completionsByDay } from '../../utils/completions';
import './SummaryWidget.css';

const PRIORITIES = ['high', 'medium', 'low'];

// The content of the Summary widget. The card and title come from <Widget>.
//   tasks: the whole list, for what is due and what got done lately; without it those are left out
function SummaryWidget({
  active,
  completed,
  openByPriority = { high: 0, medium: 0, low: 0 },
  tasks,
}) {
  const today = useToday();
  const total = active + completed;
  // Avoid dividing by zero when there are no tasks yet.
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="summary-widget">
      <dl className="summary-stats">
        <div className="summary-stat">
          <dt className="label">Active</dt>
          <dd>{active}</dd>
        </div>
        <div className="summary-stat">
          <dt className="label">Completed</dt>
          <dd>{completed}</dd>
        </div>
      </dl>
      {tasks && <DueFigures tasks={tasks} today={today} />}
      <ul className="summary-priorities" aria-label="Open tasks by priority">
        {PRIORITIES.map((priority) => (
          <li
            key={priority}
            // A priority with nothing open is shown quietly instead of in its colour.
            className={
              openByPriority[priority] > 0
                ? `summary-priority summary-priority-${priority}`
                : 'summary-priority'
            }
          >
            <strong>{openByPriority[priority]}</strong> {priority} open
          </li>
        ))}
      </ul>
      <div className="summary-progress-row">
        <ProgressBar value={percent} label="Tasks completed" className="summary-progress" />
        <p className="summary-caption">
          {completed} of {total} done ({percent}%)
        </p>
      </div>
      {tasks && (
        <dl className="summary-recent">
          <dt className="label">Done, last 7 days</dt>
          <dd>{completionsByDay(tasks, today).reduce((sum, day) => sum + day.count, 0)}</dd>
        </dl>
      )}
    </div>
  );
}

// Three smaller figures under the main two: what needs doing soon, and what got done this week.
// Overdue is set in bold when there is any, by weight rather than colour (DESIGN.md).
function DueFigures({ tasks, today }) {
  const [{ weekStart }] = useSettings();
  const due = countDue(tasks, today);
  const figures = [
    { label: 'Overdue', value: due.overdue, urgent: due.overdue > 0 },
    { label: 'Due today', value: due.today },
    { label: 'Done this week', value: completedThisWeek(tasks, today, weekStart) },
  ];
  return (
    <dl className="summary-figures">
      {figures.map((figure) => (
        <div key={figure.label} className="summary-figure" data-urgent={figure.urgent || undefined}>
          <dt className="label">{figure.label}</dt>
          <dd>{figure.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default SummaryWidget;
