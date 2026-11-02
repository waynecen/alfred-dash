import { useState, useRef } from 'react';
import formatCreatedDate from '../../utils/formatCreatedDate';

function TaskItem({ task, onToggle, onEdit, onDelete }) {
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

  return (
    <li className={task.completed ? 'task-item completed' : 'task-item'}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        aria-label={`Mark complete: ${task.text}`}
      />
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
      {/* Tasks saved before this feature have no createdAt, but their id is a timestamp too. */}
      <time className="task-date" dateTime={new Date(task.createdAt ?? task.id).toISOString()}>
        {formatCreatedDate(task.createdAt ?? task.id)}
      </time>
      <button
        type="button"
        className="delete-button"
        onClick={() => onDelete(task.id)}
        // Screen readers would just hear "Delete" for every task without this.
        aria-label={`Delete task: ${task.text}`}
      >
        Delete
      </button>
    </li>
  );
}

export default TaskItem;
