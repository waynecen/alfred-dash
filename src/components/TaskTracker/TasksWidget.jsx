import { useState } from 'react';
import TaskForm from './TaskForm';
import TaskFilter from './TaskFilter';
import TaskList from './TaskList';
import countTasks from '../../utils/countTasks';
import filterTasks from '../../utils/filterTasks';
import sortTasks from '../../utils/sortTasks';
import moveTask from '../../utils/moveTask';
import './TaskTracker.css';

// The content of the Tasks widget. The card and title come from <Widget>.
function TasksWidget({ tasks, onAdd, onToggle, onEdit, onPriorityChange, onDelete, onReorder }) {
  // The filter and sort are temporary UI state, so plain useState is enough (no need to save them).
  const [status, setStatus] = useState('all');
  // null means "the order tasks were added in"; otherwise { key, direction }.
  const [sort, setSort] = useState(null);

  // Clicking a column sorts it ascending first; clicking it again flips the direction.
  function handleSort(key) {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  }

  // Moving a task makes the order on screen the real order, so any column sort is cleared.
  function handleMove(fromId, toId) {
    onReorder(moveTask(sortTasks(tasks, sort), fromId, toId));
    setSort(null);
  }

  // Work out which tasks to show. We don't store this, we calculate it each render.
  const visibleTasks = sortTasks(filterTasks(tasks, { status }), sort);

  return (
    <div className="task-tracker">
      {/* Counts come from ALL tasks, so they stay the same whichever filter is on. */}
      <TaskFilter filter={status} counts={countTasks(tasks)} onChange={setStatus} />
      <TaskForm onAdd={onAdd} />
      <TaskList
        tasks={visibleTasks}
        totalCount={tasks.length}
        sort={sort}
        onSort={handleSort}
        onToggle={onToggle}
        onEdit={onEdit}
        onPriorityChange={onPriorityChange}
        onDelete={onDelete}
        onMove={handleMove}
      />
    </div>
  );
}

export default TasksWidget;
