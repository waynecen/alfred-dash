import { useId, useRef, useState } from 'react';
import useToday from '../../hooks/useToday';
import useSettings from '../../hooks/useSettings';
import DatePicker from '../DatePicker/DatePicker';
import ProgressBar from '../ProgressBar/ProgressBar';
import AddLine from '../AddLine/AddLine';
import InlineEditor from '../InlineEditor/InlineEditor';
import useRestoreFocus from '../../hooks/useRestoreFocus';
import WidgetState from '../WidgetState/WidgetState';
import { describeProgress, goalProgress, isReached, parseGoal } from '../../data/goals';
import { parseTags } from '../../data/tasks';
import { daysBetween, formatDay, parseISODate } from '../../utils/dates';
import { plural } from '../../utils/text';
import './GoalsWidget.css';

const SHORT_DATE = { day: 'numeric', month: 'short' };

// When a goal is due, and how long is left: 'By 31 Dec · 54 days left', 'By 6 Nov · 1 day late'.
// A goal already reached just keeps its date.
function describeDue(dueDate, today, reached) {
  if (!dueDate) return null;
  const by = `By ${formatDay(dueDate, SHORT_DATE)}`;
  if (reached) return by;
  const left = daysBetween(today, dueDate);
  if (left > 0) return `${by} · ${plural(left, 'day')} left`;
  if (left === 0) return `${by} · due today`;
  return `${by} · ${plural(-left, 'day')} late`;
}

// The goals, each with how far it has come as a figure and a bar, the ones still to reach first
// (the soonest due at the top), then a line to add one.
//   goals: [{ id, title, kind, target, progress, unit, tag, dueDate }]    tasks: for tasks goals
//   actions: { addGoal, updateGoal, stepGoal, deleteGoal }
function GoalsWidget({ goals, tasks, actions }) {
  const today = useToday();
  const [{ weekStart }] = useSettings();
  const rows = goals
    .map((goal) => {
      const progress = goalProgress(goal, tasks);
      return { goal, progress, reached: isReached(progress) };
    })
    .sort(
      (a, b) =>
        a.reached - b.reached ||
        (a.goal.dueDate ?? '9999').localeCompare(b.goal.dueDate ?? '9999') ||
        a.goal.id - b.goal.id
    );
  const reached = rows.filter((row) => row.reached).length;

  return (
    <div className="goals">
      {rows.length ? (
        <>
          <p className="goals-summary">
            {plural(rows.length, 'goal')} · {reached} reached
          </p>
          <ul className="goals-list">
            {rows.map((row) => (
              <GoalItem key={row.goal.id} {...row} today={today} actions={actions} />
            ))}
          </ul>
        </>
      ) : (
        <WidgetState
          status="empty"
          message="Set a goal: a number to reach (“Read 12 books”), or a tag whose tasks to finish (“Launch #launch”)."
        />
      )}
      <AddGoal onAdd={actions.addGoal} today={today} weekStart={weekStart} />
    </div>
  );
}

// One goal: its title (which opens the editor), the figure and bar, when it is due, and for a
// count goal, a step back and a step on.
function GoalItem({ goal, progress, reached, today, actions }) {
  const [editing, setEditing] = useState(false);
  const titleButton = useRef(null);
  // Back from the editor, focus returns to the title that opened it.
  useRestoreFocus(editing, titleButton);

  if (editing) {
    return (
      <li className="goal is-editing">
        <GoalEditor
          goal={goal}
          today={today}
          onSave={(fields) => {
            actions.updateGoal(goal.id, fields);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
          onDelete={() => actions.deleteGoal(goal.id)}
        />
      </li>
    );
  }

  const figure = describeProgress(goal, progress);
  const late = !reached && goal.dueDate && goal.dueDate < today;
  const meta = [
    goal.kind === 'tasks' && `#${goal.tag}${progress.total === 0 ? ' · tag tasks to count them' : ''}`,
    describeDue(goal.dueDate, today, reached),
  ].filter(Boolean);

  return (
    <li className={reached ? 'goal is-reached' : 'goal'}>
      <div className="goal-head">
        <button ref={titleButton} type="button" className="goal-title" onClick={() => setEditing(true)} title="Edit goal">
          {goal.title}
        </button>
        {reached && <span className="goal-tag">Reached</span>}
        <span className="goal-figure">{figure}</span>
      </div>
      <ProgressBar value={progress.done} max={Math.max(progress.total, 1)} label={goal.title} valueText={figure} />
      {(meta.length > 0 || goal.kind === 'count') && (
        <div className="goal-foot">
          <span className={late ? 'goal-meta label is-late' : 'goal-meta label'}>{meta.join(' · ')}</span>
          {goal.kind === 'count' && (
            <span className="goal-stepper">
              <button
                type="button"
                onClick={() => actions.stepGoal(goal.id, -1)}
                disabled={goal.progress <= 0}
                aria-label={`One less: ${goal.title}`}
              >
                −
              </button>
              <button type="button" onClick={() => actions.stepGoal(goal.id, 1)} aria-label={`One more: ${goal.title}`}>
                +
              </button>
            </span>
          )}
        </div>
      )}
    </li>
  );
}

// Changes a goal: its title, how far it has come and how far it goes (or its tag), and its date.
// Escape leaves it as it was.
function GoalEditor({ goal, today, onSave, onCancel, onDelete }) {
  const [title, setTitle] = useState(goal.title);
  const [progress, setProgress] = useState(String(goal.progress));
  const [target, setTarget] = useState(String(goal.target ?? 1));
  const [unit, setUnit] = useState(goal.unit);
  const [tag, setTag] = useState(goal.tag ? `#${goal.tag}` : '');
  const [dueDate, setDueDate] = useState(goal.dueDate);
  const id = useId();
  const field = (name) => `${id}-${name}`;

  function save() {
    const fields = { title: title.trim() || goal.title, dueDate };
    if (goal.kind === 'count') {
      fields.target = Math.max(1, Number(target) || goal.target);
      fields.progress = Math.max(0, Number(progress) || 0);
      fields.unit = unit.trim();
    } else {
      fields.tag = parseTags(tag)[0] ?? goal.tag;
    }
    onSave(fields);
  }

  return (
    <InlineEditor
      className="goal-editor"
      onSave={save}
      onCancel={onCancel}
      actions={
        <button type="button" className="editor-quiet editor-danger" onClick={onDelete}>
          Delete
        </button>
      }
    >
      <div className="goal-editor-field goal-editor-wide">
        <label className="label" htmlFor={field('title')}>Goal</label>
        <input id={field('title')} type="text" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus autoComplete="off" />
      </div>
      {goal.kind === 'count' ? (
        <>
          <div className="goal-editor-field">
            <label className="label" htmlFor={field('progress')}>Done</label>
            <input id={field('progress')} type="number" min={0} step="any" value={progress} onChange={(event) => setProgress(event.target.value)} />
          </div>
          <div className="goal-editor-field">
            <label className="label" htmlFor={field('target')}>Of</label>
            <input id={field('target')} type="number" min={1} step="any" value={target} onChange={(event) => setTarget(event.target.value)} />
          </div>
          <div className="goal-editor-field">
            <label className="label" htmlFor={field('unit')}>Unit</label>
            <input id={field('unit')} type="text" value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="books" autoComplete="off" />
          </div>
        </>
      ) : (
        <div className="goal-editor-field">
          <label className="label" htmlFor={field('tag')}>Tasks tagged</label>
          <input id={field('tag')} type="text" value={tag} onChange={(event) => setTag(event.target.value)} autoComplete="off" />
        </div>
      )}
      <div className="goal-editor-field">
        <label className="label" htmlFor={field('due')}>By</label>
        <DatePicker
          value={dueDate}
          today={today}
          onChange={setDueDate}
          title={`Date to reach “${goal.title}” by`}
          buttonProps={{ id: field('due'), className: 'goal-editor-date' }}
        >
          {dueDate ? formatDay(dueDate, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
        </DatePicker>
      </div>
    </InlineEditor>
  );
}

// A line to type a goal into, read as it is typed: a number makes it a count, a #tag makes it
// follow those tasks, and a date sets when it is due.
function AddGoal({ onAdd, today, weekStart }) {
  const [draft, setDraft] = useState('');
  const parsed = draft.trim() ? parseGoal(draft, { now: parseISODate(today), weekStart }) : null;

  let preview = '';
  if (parsed?.title) {
    preview = parsed.kind === 'tasks' ? `Tasks tagged #${parsed.tag}` : `Count to ${parsed.target}${parsed.unit ? ` ${parsed.unit}` : ''}`;
    if (parsed.dueDate) preview += ` · by ${formatDay(parsed.dueDate, SHORT_DATE)}`;
  }

  return (
    <AddLine
      label="New goal"
      placeholder="New goal, e.g. “Read 12 books by dec 31”"
      value={draft}
      onChange={setDraft}
      onSubmit={() => {
        onAdd(parsed);
        setDraft('');
      }}
      canAdd={Boolean(parsed?.title)}
      preview={preview}
    />
  );
}

export default GoalsWidget;
