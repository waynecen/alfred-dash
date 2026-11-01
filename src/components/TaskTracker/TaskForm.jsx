import { useState } from 'react';

function TaskForm({ onAdd }) {
  // Controlled input: React state is the single source of truth for the text.
  const [text, setText] = useState('');

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    const trimmed = text.trim();
    if (trimmed === '') return; // ignore empty (or spaces-only) input
    onAdd(trimmed);
    setText('');
  }

  // Using a <form> means pressing Enter submits, with no extra key handling.
  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <label htmlFor="new-task">New task</label>
      <div className="task-form-row">
        <input
          id="new-task"
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What needs doing?"
        />
        <button type="submit">Add</button>
      </div>
    </form>
  );
}

export default TaskForm;
