import { addDays, startOfNextWeek } from '../../utils/dates';

// Under the table. With nothing selected: Clear completed, and how to select. With tasks
// selected: what can be done to all of them at once. Every action offers Undo in its toast.
//   selectedIds: the selected tasks on screen, in the order shown
//   completedIds: every done task, for Clear completed
//   today: 'YYYY-MM-DD'    weekStart: 1 for Monday, 0 for Sunday, for "Next week"
function TaskFooter({ selectedIds, completedIds, today, weekStart = 1, onComplete, onSetDue, onDelete, onClearCompleted, onClearSelection }) {
  const count = selectedIds.length;
  const dueChoices = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'Next week', value: startOfNextWeek(today, weekStart) },
    { label: 'No date', value: null },
  ];

  return (
    <div className="task-footer">
      {/* Always on the page, so screen readers hear the count change. */}
      <p className="visually-hidden" aria-live="polite">
        {count > 0 ? `${count} selected` : ''}
      </p>
      {count > 0 ? (
        <div className="task-bulk" role="toolbar" aria-label={`${count} selected tasks`}>
          <strong className="task-bulk-count" aria-hidden="true">
            {count} selected
          </strong>
          <button type="button" onClick={() => onComplete(selectedIds)}>
            Complete
          </button>
          <span className="task-bulk-group" role="group" aria-label="Set due date">
            <span className="task-bulk-label label" aria-hidden="true">
              Due
            </span>
            {dueChoices.map((choice) => (
              <button
                key={choice.label}
                type="button"
                onClick={() => onSetDue(selectedIds, choice.value)}
                aria-label={`Due ${choice.label.toLowerCase()}`}
              >
                {choice.label}
              </button>
            ))}
          </span>
          <button type="button" className="task-bulk-delete" onClick={() => onDelete(selectedIds)}>
            Delete
          </button>
          <button type="button" className="task-bulk-clear" onClick={onClearSelection}>
            Clear selection
          </button>
        </div>
      ) : (
        <div className="task-footer-idle">
          <span className="task-footer-hint">Shift- or Ctrl-click tasks to select several</span>
          {completedIds.length > 0 && (
            <button type="button" className="task-footer-clear" onClick={() => onClearCompleted(completedIds)}>
              Clear completed ({completedIds.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskFooter;
