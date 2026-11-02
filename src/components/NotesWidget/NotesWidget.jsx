import { useId } from 'react';
import './NotesWidget.css';

// A notepad. The text is kept by App, so it survives removing and re-adding the widget.
function NotesWidget({ value, onChange }) {
  const hintId = useId();

  return (
    <div className="notes-widget">
      <textarea
        className="notes-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Jot something down…"
        aria-label="Notes"
        aria-describedby={hintId}
        rows={6}
      />
      <p id={hintId} className="notes-hint">
        Saved automatically · {value.length} {value.length === 1 ? 'character' : 'characters'}
      </p>
    </div>
  );
}

export default NotesWidget;
