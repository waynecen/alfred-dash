import { useState, useRef } from 'react';
import formatCreatedDate from '../../utils/formatCreatedDate';
import DueDate from './DueDate';
import TaskDetails from './TaskDetails';
import { describeRecurrence, TASK_DRAG_TYPE } from '../../data/tasks';

// A line under the task's text: how far along its steps are, its tags (each one filters the list
// to it) and how it repeats. Nothing at all when there is none of these, so plain tasks keep a
// single line.
//   stepCount: { done, total } | undefined
function TaskMeta({ task, stepCount, onFilterTag }) {
  const tags = task.tags ?? [];
  if (tags.length === 0 && !task.recurrence && !stepCount) return null;
  return (
    <div className="task-meta">
      {stepCount && (
        <span className="task-steps" aria-label={`${stepCount.done} of ${stepCount.total} steps done`}>
          {stepCount.done}/{stepCount.total} steps
        </span>
      )}
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className="task-tag"
          onClick={() => onFilterTag?.(tag)}
          aria-label={`Show tasks tagged ${tag}`}
        >
          #{tag}
        </button>
      ))}
      {task.recurrence && <span className="task-repeat">{describeRecurrence(task.recurrence)}</span>}
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onEdit,
  onPriorityChange,
  onUpdate,
  onDelete,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onStep,
  onFilterTag,
  onAddStep,
  depth = 0,
  stepCount,
  selected = false,
  onSelect,
  today,
}) {
  // Tasks saved before priorities existed have none, so treat them as medium.
  const priority = task.priority ?? 'medium';

  // Whether this item is being edited is only this item's business,
  // so it stays here instead of in App.
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  // Remembers that Escape was pressed, so the blur that follows doesn't save.
  const cancelled = useRef(false);
  // The detail row under this one: notes, due date, tags and repeat.
  const [expanded, setExpanded] = useState(false);
  const detailsId = `task-details-${task.id}`;

  // A plain click edits the text. Shift-click (a range) or Ctrl/Cmd-click (one task) selects
  // instead, for the bulk actions under the table; Shift+Enter and Ctrl+Enter do the same.
  function handleTextClick(event) {
    if (onSelect && (event.shiftKey || event.ctrlKey || event.metaKey)) {
      event.preventDefault(); // no text selection from the Shift-click
      onSelect(task.id, { range: event.shiftKey });
      return;
    }
    startEditing();
  }

  function startEditing() {
    setDraft(task.text); // always start from the current text
    cancelled.current = false;
    setIsEditing(true);
  }

  function finishEditing() {
    const trimmed = draft.trim();
    // Only save if something actually changed and it isn't empty.
    if (trimmed !== '' && trimmed !== task.text) {
      onEdit(task.id, trimmed);
    }
    setIsEditing(false);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      finishEditing();
    } else if (event.key === 'Escape') {
      cancelled.current = true;
      setIsEditing(false);
    }
  }

  // Clicking away makes the input lose focus ("blur").
  function handleBlur() {
    if (!cancelled.current) finishEditing();
  }

  function handleHandleKeyDown(event) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      onStep(event.key === 'ArrowUp' ? -1 : 1);
    }
  }

  const rowClass = [
    'task-row',
    task.completed && 'completed',
    isDragging && 'dragging',
    expanded && 'expanded',
    depth > 0 && 'subtask',
    selected && 'selected',
  ]
    .filter(Boolean)
    .join(' ');

  const row = (
    <tr
      className={rowClass}
      data-task-id={task.id}
      onDragOver={(event) => {
        event.preventDefault(); // lets this row accept a drop
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <td className="col-drag">
        <span
          role="button"
          tabIndex={0}
          className="drag-handle"
          draggable
          aria-label={`Reorder task: ${task.text}`}
          title="Drag to reorder (or use the up and down arrow keys)"
          onKeyDown={handleHandleKeyDown}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(task.id));
            // Lets the Calendar take the task too: dropped on a day, it becomes due then.
            event.dataTransfer.setData(TASK_DRAG_TYPE, String(task.id));
            // Drag the whole row, not just the small handle.
            const row = event.currentTarget.closest('tr');
            if (row) event.dataTransfer.setDragImage(row, 0, 0);
            onDragStart?.();
          }}
          onDragEnd={onDragEnd}
        >
          <span aria-hidden="true">⠿</span>
        </span>
      </td>
      <td className="col-done">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          aria-label={`Mark complete: ${task.text}`}
        />
      </td>
      <td className="col-description">
        {isEditing ? (
          <input
            className="task-edit-input"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            aria-label="Edit task"
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="task-text"
            onClick={handleTextClick}
            // Shift-clicking would otherwise also select the page's text.
            onMouseDown={(event) => event.shiftKey && event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.shiftKey || event.ctrlKey || event.metaKey)) {
                event.preventDefault(); // no click, so no edit
                onSelect?.(task.id, { range: event.shiftKey });
              }
            }}
            title="Click to edit, Shift- or Ctrl-click to select"
          >
            {task.text}
            {selected && <span className="visually-hidden"> (selected)</span>}
          </button>
        )}
        <TaskMeta task={task} stepCount={stepCount} onFilterTag={onFilterTag} />
      </td>
      <td className="col-priority">
        <select
          className={`priority-select priority-${priority}`}
          value={priority}
          onChange={(event) => onPriorityChange(task.id, event.target.value)}
          aria-label={`Priority: ${task.text}`}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </td>
      <td className="col-due">
        <DueDate
          value={task.dueDate ?? null}
          today={today}
          completed={task.completed}
          taskText={task.text}
          onChange={(dueDate) => onUpdate(task.id, { dueDate })}
        />
      </td>
      <td className="col-created">
        {/* Tasks saved before this feature have no createdAt, but their id is a timestamp too. */}
        <time className="task-date" dateTime={new Date(task.createdAt ?? task.id).toISOString()}>
          {formatCreatedDate(task.createdAt ?? task.id)}
        </time>
      </td>
      <td className="col-actions">
        <button
          type="button"
          className="details-button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          aria-label={`Details: ${task.text}`}
          title={expanded ? 'Hide details' : 'Notes, tags and repeat'}
        >
          {/* A chevron, turned up by CSS while the details are open. */}
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          className="delete-button"
          onClick={() => onDelete(task.id)}
          // Screen readers would just hear "Delete" for every task without this.
          aria-label={`Delete task: ${task.text}`}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </td>
    </tr>
  );

  if (!expanded) return row;
  return (
    <>
      {row}
      <tr className="task-detail-row">
        <td colSpan={7}>
          <TaskDetails
            id={detailsId}
            task={task}
            onUpdate={onUpdate}
            // Steps go one level deep, so a step can't have steps of its own.
            onAddStep={task.parentId == null && onAddStep ? (text) => onAddStep(task.id, text) : undefined}
          />
        </td>
      </tr>
    </>
  );
}

export default TaskItem;
