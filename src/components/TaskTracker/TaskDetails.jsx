import { useState } from 'react';
import DatePicker from '../DatePicker/DatePicker';
import { parseTags } from '../../data/tasks';
import { parseISODate } from '../../utils/dates';

const REPEAT_UNITS = [
  { value: 'day', label: 'days' },
  { value: 'week', label: 'weeks' },
  { value: 'month', label: 'months' },
];

// Everything about a task that doesn't fit in its row: notes, steps, due date, tags and repeat.
// Text fields save when they lose focus (or on Enter, for one-line fields), so typing doesn't
// write to storage on every key; pickers save straight away.
//   id: for the row's aria-controls
//   onAddStep: adds a step under this task; left out for a step, since steps go one level deep
function TaskDetails({ id, task, onUpdate, onAddStep }) {
  const [notes, setNotes] = useState(task.notes ?? '');
  const [step, setStep] = useState('');
  const [tags, setTags] = useState(formatTags(task.tags));
  const field = (name) => `${id}-${name}`;
  const recurrence = task.recurrence;
  const n = recurrence?.interval ?? 1;

  function saveNotes() {
    if (notes !== (task.notes ?? '')) onUpdate(task.id, { notes });
  }

  function saveTags() {
    const next = parseTags(tags);
    setTags(formatTags(next)); // shows the tags as they were saved
    if (next.join() !== (task.tags ?? []).join()) onUpdate(task.id, { tags: next });
  }

  function setRepeat(change) {
    const next = { every: 'week', interval: 1, ...recurrence, ...change };
    onUpdate(task.id, { recurrence: next.every ? next : null });
  }

  return (
    <div className="task-details" id={id}>
      <div className="task-details-main">
        <div className="task-details-field task-details-notes">
          <label htmlFor={field('notes')}>Notes</label>
          <textarea
            id={field('notes')}
            value={notes}
            rows={3}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={saveNotes}
            placeholder="Anything worth remembering"
          />
        </div>
        {onAddStep && (
          <div className="task-details-field">
            <label htmlFor={field('step')}>Add a step</label>
            <input
              id={field('step')}
              type="text"
              value={step}
              onChange={(event) => setStep(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || !step.trim()) return;
                onAddStep(step.trim());
                setStep(''); // ready for the next one
              }}
              placeholder="Press Enter to add it under this task"
            />
          </div>
        )}
      </div>
      <div className="task-details-side">
        <div className="task-details-field">
          <label htmlFor={field('due')}>Due</label>
          <DatePicker
            value={task.dueDate ?? null}
            onChange={(dueDate) => onUpdate(task.id, { dueDate })}
            title={`Due date: ${task.text}`}
            buttonProps={{ id: field('due'), className: 'task-details-date' }}
          >
            <span className={task.dueDate ? undefined : 'task-details-date-none'}>
              {task.dueDate
                ? parseISODate(task.dueDate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                : 'No date'}
            </span>
            {/* A calendar page, so the field reads as a date to pick. */}
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M2 3.5h12v10H2zM2 6.5h12M5 1.5v3M11 1.5v3" />
            </svg>
          </DatePicker>
        </div>
        <div className="task-details-field">
          <label htmlFor={field('tags')}>Tags</label>
          <input
            id={field('tags')}
            type="text"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            onBlur={saveTags}
            onKeyDown={(event) => event.key === 'Enter' && saveTags()}
            placeholder="#home #errands"
          />
        </div>
        <fieldset className="task-details-field task-details-repeat">
          <legend>Repeat</legend>
          {/* Reads "Every [2] [weeks]", or just "[Never]". */}
          <div className="task-details-repeat-row">
            {recurrence && (
              <>
                <span aria-hidden="true">Every</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={n}
                  onChange={(event) => {
                    const value = Math.min(365, Math.max(1, Math.round(Number(event.target.value)) || 1));
                    setRepeat({ interval: value });
                  }}
                  aria-label="Repeat every how many"
                />
              </>
            )}
            <select
              value={recurrence?.every ?? ''}
              onChange={(event) => setRepeat({ every: event.target.value || null })}
              aria-label="Repeat"
            >
              <option value="">Never</option>
              {REPEAT_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {n === 1 ? unit.value : unit.label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      </div>
    </div>
  );
}

const formatTags = (tags = []) => tags.map((tag) => `#${tag}`).join(' ');

export default TaskDetails;
