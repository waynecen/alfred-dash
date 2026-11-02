import { useState, useRef } from 'react';
import './EditableTitle.css';

// A heading that shows a pencil on hover (or focus). Clicking it turns the text into an input.
function EditableTitle({ value, onChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  // Remembers that Escape was pressed, so the blur that follows doesn't save.
  const cancelled = useRef(false);

  function startEditing() {
    setDraft(value);
    cancelled.current = false;
    setIsEditing(true);
  }

  function finishEditing() {
    const trimmed = draft.trim();
    // Keep the old name if the new one is empty.
    if (trimmed !== '' && trimmed !== value) onChange(trimmed);
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

  if (isEditing) {
    return (
      <h1 className="editable-title">
        <input
          className="editable-title-input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => !cancelled.current && finishEditing()}
          aria-label="Dashboard title"
          maxLength={60}
          autoFocus
        />
      </h1>
    );
  }

  return (
    <h1 className="editable-title">
      {value}
      <button
        type="button"
        className="editable-title-edit"
        onClick={startEditing}
        aria-label="Edit dashboard title"
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
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
    </h1>
  );
}

export default EditableTitle;
