import { useState } from "react";

function TaskForm({ onAdd }) {
  // Controlled input: React state is the single source of truth for the text.
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    const trimmed = text.trim();
    if (trimmed === "") return; // ignore empty (or spaces-only) input
    onAdd(trimmed, priority);
    setText("");
  }

  // Using a <form> means pressing Enter submits, with no extra key handling.
  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form-row">
        <div className="task-form-field task-form-text">
          <label htmlFor="new-task">New task</label>
          <input
            id="new-task"
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="What needs doing?"
          />
        </div>
        <div className="task-form-field">
          <label htmlFor="new-task-priority">Priority</label>
          <select
            id="new-task-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <button type="submit">Add</button>
      </div>
    </form>
  );
}

export default TaskForm;
