import { useId, useState } from "react";
import parseQuickAdd from "../../utils/parseQuickAdd";
import { relativeDay } from "../../utils/dates";
import { describeRecurrence } from "../../data/tasks";
import useSettings from "../../hooks/useSettings";

const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };

// What quick-add understood from the text, as short labels: ["Tomorrow", "High", "#home"].
function describeParsed({ dueDate, priority, tags, recurrence }) {
  return [
    dueDate && `Due ${relativeDay(dueDate)}`,
    priority && PRIORITY_LABELS[priority],
    ...tags.map((tag) => `#${tag}`),
    describeRecurrence(recurrence),
  ].filter(Boolean);
}

//   onAdd(text, priority, { dueDate, tags, recurrence })
function TaskForm({ onAdd }) {
  // Controlled input: React state is the single source of truth for the text.
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");
  const previewId = useId();
  const [{ weekStart }] = useSettings();

  // Quick-add reads dates, !priority, #tags and repeats out of the text as it is typed.
  const parsed = parseQuickAdd(text, { weekStart });
  const understood = text.trim() ? describeParsed(parsed) : [];

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    if (text.trim() === "") return; // ignore empty (or spaces-only) input
    // A typed !priority wins over the dropdown.
    onAdd(parsed.text, parsed.priority ?? priority, {
      dueDate: parsed.dueDate,
      tags: parsed.tags,
      recurrence: parsed.recurrence,
    });
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
            placeholder="What needs doing? e.g. “Call bank fri !high”"
            aria-describedby={previewId}
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
      {/* Always on the page, so screen readers hear each change; empty when nothing was read. */}
      <p id={previewId} className="task-form-preview" aria-live="polite">
        {understood.map((label) => (
          <span key={label} className="task-form-chip">
            {label}
          </span>
        ))}
      </p>
    </form>
  );
}

export default TaskForm;
