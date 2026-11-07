import { useRef } from 'react';
import { isOverdue, parseISODate, relativeDay, toISODate } from '../../utils/dates';

// A task's due day, as a short label ("Today", "Fri", "13 Nov") that opens the browser's own date
// picker. The picker's Clear removes the date. Overdue is set in bold and today in ink, by weight
// rather than colour (DESIGN.md). A done task's date is just a quiet note.
//   value: 'YYYY-MM-DD' | null
//   today: 'YYYY-MM-DD', so the labels move on at midnight
function DueDate({ value, today = toISODate(), completed, taskText, onChange }) {
  const input = useRef(null);
  const now = parseISODate(today);
  const label = value ? relativeDay(value, now) : 'Add date';
  const state = !value
    ? 'none'
    : completed
      ? 'done'
      : isOverdue(value, now)
        ? 'overdue'
        : value === today
          ? 'today'
          : 'later';

  function openPicker() {
    try {
      input.current.showPicker();
    } catch {
      // Browsers without showPicker (or that refuse it) still let people type the date.
      input.current.focus();
    }
  }

  return (
    <span className="due-date">
      <button
        type="button"
        className={`due-date-button due-${state}`}
        onClick={openPicker}
        aria-label={`Due date: ${taskText}, ${value ? label : 'none'}${state === 'overdue' ? ', overdue' : ''}`}
        title={value ? parseISODate(value).toLocaleDateString(undefined, { dateStyle: 'full' }) : 'Set a due date'}
      >
        {label}
      </button>
      <input
        ref={input}
        type="date"
        className="due-date-input"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        tabIndex={-1}
        aria-hidden="true"
      />
    </span>
  );
}

export default DueDate;
