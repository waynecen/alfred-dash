import { useState, useRef } from 'react';
import formatCreatedDate from '../../utils/formatCreatedDate';

function TaskItem({
  task,
  onToggle,
  onEdit,
  onPriorityChange,
  onDelete,
  isDragging,
  isOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onStep,
}) {
  // Tasks saved before priorities existed have none, so treat them as medium.
  const priority = task.priority ?? 'medium';

  // Whether this item is being edited is only this item's business,
  // so it stays here instead of in App.
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  // Remembers that Escape was pressed, so the blur that follows doesn't save.
  const cancelled = useRef(false);

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

  const rowClass = ['task-row', task.completed && 'completed', isDragging && 'dragging', isOver && 'drag-over']
    .filter(Boolean)
    .join(' ');

  return (
    <tr
      className={rowClass}
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
        <button
          type="button"
          className="drag-handle"
          draggable
          aria-label={`Reorder task: ${task.text}`}
          title="Drag to reorder (or use the up and down arrow keys)"
          onKeyDown={handleHandleKeyDown}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(task.id));
            // Drag the whole row, not just the small handle.
            const row = event.currentTarget.closest('tr');
            if (row) event.dataTransfer.setDragImage(row, 0, 0);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
        >
          <span aria-hidden="true">⠿</span>
        </button>
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
            onClick={startEditing}
            title="Click to edit"
          >
            {task.text}
          </button>
        )}
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
      <td className="col-created">
        {/* Tasks saved before this feature have no createdAt, but their id is a timestamp too. */}
        <time className="task-date" dateTime={new Date(task.createdAt ?? task.id).toISOString()}>
          {formatCreatedDate(task.createdAt ?? task.id)}
        </time>
      </td>
      <td className="col-actions">
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
}

export default TaskItem;
