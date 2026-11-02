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
      <label htmlFor="new-task">New task</label>
      <div className="task-form-row">
        <input
          id="new-task"
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What needs doing?"
        />
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          aria-label="Priority"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit">Add</button>
      </div>
    </form>
  );
}

export default TaskForm;
