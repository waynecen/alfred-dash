import { useEffect, useState } from 'react';
import { useAI } from '../../hooks/useAI';
import WidgetState from '../WidgetState/WidgetState';
import { formatOpenTasks } from '../../utils/dashboardContext';
import parseTaskSuggestions from '../../utils/parseTaskSuggestions';
import './TaskAssistantWidget.css';

// Notes beyond this are cut, so a long notepad can't make a huge request.
const MAX_NOTES_CHARS = 8000;

const JSON_FORMAT = `Reply with only a JSON array and no other text, in this shape:
[{"text": "Short imperative task", "priority": "low" | "medium" | "high"}]
Keep each text under 80 characters.`;

const PROMPTS = {
  breakdown: `You split one task into concrete next steps someone can start on right away.
${JSON_FORMAT}
Give 3 to 8 steps, in the order to do them. Give steps that block the rest a higher priority; otherwise use the parent task's priority.
Do not repeat tasks that are already on the list.`,
  notes: `You find action items in a person's notes.
${JSON_FORMAT}
Include only things the person clearly still needs to do; skip ideas, facts, and anything marked done. Rewrite each as a short imperative task. Use high priority only for clear deadlines or blockers.
Skip anything already on the task list. If there are no action items, reply [].`,
};

const MODES = [
  { id: 'breakdown', label: 'Break down a task' },
  { id: 'notes', label: 'From notes' },
];

// Turns one task, or the Notes text, into suggested tasks the user adds one at a time or all at once.
function TaskAssistantWidget({ tasks, notes, onAddTasks, notify }) {
  const ai = useAI();
  const [mode, setMode] = useState('breakdown');
  const [taskId, setTaskId] = useState(null);
  // null until a reply is parsed; then the suggestions not yet added or dismissed.
  const [suggestions, setSuggestions] = useState(null);

  // Steps go one level deep, so only tasks that aren't steps can be broken down.
  const openTasks = tasks.filter((task) => !task.completed && task.parentId == null);
  // The task the suggestions on screen were made for: they are added as its steps, even if the
  // picker has moved on since.
  const [brokenDownId, setBrokenDownId] = useState(null);
  // Fall back to the first open task if nothing is picked or the picked one is gone or done.
  const target = openTasks.find((task) => task.id === taskId) ?? openTasks[0];
  const hasNotes = notes.trim() !== '';

  useEffect(() => {
    if (ai.status === 'done') setSuggestions(parseTaskSuggestions(ai.text));
  }, [ai.status, ai.text]);

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setSuggestions(null);
    ai.reset();
  }

  const canSuggest = mode === 'breakdown' ? Boolean(target) : hasNotes;

  function suggest() {
    // Retry can outlive its target: the task may have been deleted or the notes cleared since.
    if (!canSuggest) return;
    setSuggestions(null);
    const taskList = formatOpenTasks(tasks) || '(none)';
    const content =
      mode === 'breakdown'
        ? `Task to break down: [${target.priority ?? 'medium'}] ${target.text}\n\nTasks already on the list:\n${taskList}`
        : `Notes:\n${notes.trim().slice(0, MAX_NOTES_CHARS)}\n\nTasks already on the list:\n${taskList}`;
    setBrokenDownId(mode === 'breakdown' ? target.id : null);
    ai.send({ system: PROMPTS[mode], messages: [{ role: 'user', content }], effort: 'medium' });
  }

  function add(items) {
    // A breakdown's steps go under their task, unless it was deleted meanwhile.
    const parent = mode === 'breakdown' ? tasks.find((task) => task.id === brokenDownId) : null;
    onAddTasks(parent ? items.map((item) => ({ ...item, parentId: parent.id })) : items);
    const added = new Set(items);
    const rest = suggestions.filter((item) => !added.has(item));
    setSuggestions(rest.length > 0 ? rest : null);
    const what = parent
      ? `${items.length === 1 ? 'a step' : `${items.length} steps`} to “${parent.text}”`
      : items.length === 1
        ? `“${items[0].text}”`
        : `${items.length} tasks`;
    notify({ message: `Added ${what}` });
  }

  function dismiss(item) {
    const rest = suggestions.filter((other) => other !== item);
    setSuggestions(rest.length > 0 ? rest : null);
  }

  let body;
  if (ai.busy) {
    body = <WidgetState status="loading" message="Thinking…" />;
  } else if (ai.status === 'error') {
    body = <WidgetState status="error" message={ai.error} onRetry={suggest} />;
  } else if (ai.status === 'refused') {
    body = <WidgetState status="error" message="Claude declined to suggest tasks for this." />;
  } else if (suggestions?.length > 0) {
    body = (
      <>
        <ul className="assistant-list">
          {suggestions.map((item) => (
            <li key={item.text} className="assistant-item">
              <span className="assistant-item-text">{item.text}</span>
              <span className={`assistant-priority priority-${item.priority}`}>{item.priority}</span>
              <button
                type="button"
                className="assistant-icon"
                aria-label={`Add “${item.text}”`}
                title="Add to tasks"
                onClick={() => add([item])}
              >
                ✓
              </button>
              <button
                type="button"
                className="assistant-icon"
                aria-label={`Dismiss “${item.text}”`}
                title="Dismiss"
                onClick={() => dismiss(item)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {suggestions.length > 1 && (
          <button type="button" className="assistant-add-all" onClick={() => add(suggestions)}>
            Add all ({suggestions.length})
          </button>
        )}
      </>
    );
  } else if (suggestions) {
    // Parsed, but nothing came back: say so rather than show a blank widget.
    body = (
      <WidgetState
        status="empty"
        message={mode === 'notes' ? 'No action items found in your notes.' : 'No steps came back. Try again.'}
      />
    );
  } else if (!canSuggest) {
    body = (
      <WidgetState
        status="empty"
        message={mode === 'notes' ? 'Write something in Notes first.' : 'Add a task to break it down.'}
      />
    );
  } else {
    body = (
      <WidgetState
        status="empty"
        message={
          mode === 'notes'
            ? 'Find the action items in your notes and turn them into tasks.'
            : 'Split a task into small next steps.'
        }
      />
    );
  }

  return (
    <div className="task-assistant">
      <div className="assistant-modes" role="group" aria-label="What to suggest from">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            className={mode === id ? 'is-active' : undefined}
            onClick={() => switchMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="assistant-controls">
        {mode === 'breakdown' && (
          <select
            aria-label="Task to break down"
            value={target?.id ?? ''}
            disabled={!target || ai.busy}
            onChange={(event) => setTaskId(Number(event.target.value))}
          >
            {openTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.text}
              </option>
            ))}
          </select>
        )}
        {ai.busy ? (
          <button type="button" onClick={ai.stop}>
            Stop
          </button>
        ) : (
          <button type="button" onClick={suggest} disabled={!canSuggest}>
            Suggest
          </button>
        )}
      </div>

      <div className="assistant-body">{body}</div>
    </div>
  );
}

export default TaskAssistantWidget;
