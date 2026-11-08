import { useId } from 'react';
import './AddLine.css';

// One line to type something into and add it: a ruled input and its Add button sharing an edge,
// and under them what the line will make, read as it is typed ("Event · Fri · 3:00 PM"). The
// Calendar, Today, Habits and Goals widgets all add this way.
//   label: what is being added, for screen readers    placeholder: an example of what to type
//   value, onChange(text): the line, kept by the caller, which reads it as it changes
//   onSubmit(): on Enter or Add, only when canAdd (by default, when something is typed)
//   preview: the line under the input; leave it out for none
//   children: more of the form, under the line (the days a new habit is due, say)
//   className: for the caller's own placing
// Escape clears a line with something in it, so a half-typed thought goes in one key.
function AddLine({ label, placeholder, value, onChange, onSubmit, canAdd = value.trim() !== '', preview, children, className }) {
  const id = useId();

  function handleSubmit(event) {
    event.preventDefault();
    if (canAdd) onSubmit();
  }

  function handleKeyDown(event) {
    if (event.key !== 'Escape' || !value) return;
    event.stopPropagation(); // clearing the line is all Escape does here
    onChange('');
  }

  return (
    <form className={['add-line', className].filter(Boolean).join(' ')} onSubmit={handleSubmit}>
      <div className="add-line-row">
        <label htmlFor={id} className="visually-hidden">
          {label}
        </label>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="done"
        />
        <button type="submit" disabled={!canAdd}>
          Add
        </button>
      </div>
      {children}
      {preview !== undefined && (
        <p className="add-line-preview" aria-live="polite">
          {preview}
        </p>
      )}
    </form>
  );
}

export default AddLine;
