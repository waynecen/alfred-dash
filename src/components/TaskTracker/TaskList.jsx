import TaskItem from './TaskItem';

function TaskList({ tasks, filter, onToggle, onEdit, onPriorityChange, onDelete }) {
  if (tasks.length === 0) {
    const message =
      filter === 'all' ? 'No tasks yet. Add one above!' : `No ${filter} tasks.`;
    return <p className="empty-message">{message}</p>;
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        // key helps React track which item is which when the list changes.
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onEdit={onEdit}
          onPriorityChange={onPriorityChange}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

export default TaskList;
