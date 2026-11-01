function TaskItem({ task, onToggle, onDelete }) {
  const checkboxId = `task-${task.id}`;

  return (
    <li className={task.completed ? 'task-item completed' : 'task-item'}>
      {/* The label wraps the text, so clicking the text also toggles the checkbox. */}
      <input
        id={checkboxId}
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
      />
      <label htmlFor={checkboxId}>{task.text}</label>
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
