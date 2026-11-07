import { useState } from 'react';
import TaskItem from './TaskItem';
import moveTask from '../../utils/moveTask';

const ARROWS = { asc: '▲', desc: '▼' };
const ARIA_SORT = { asc: 'ascending', desc: 'descending' };

// A column heading with a button beside the label that sorts the list by that column.
function SortableHeader({ label, columnKey, sort, onSort, className }) {
  const direction = sort?.key === columnKey ? sort.direction : null;

  return (
    <th scope="col" className={className} aria-sort={ARIA_SORT[direction] ?? 'none'}>
      <span className="th-content">
        {label}
        <button
          type="button"
          className={direction ? 'sort-button active' : 'sort-button'}
          onClick={() => onSort(columnKey)}
          aria-label={`Sort by ${label.toLowerCase()}`}
        >
          {/* The arrow is decoration: aria-sort on the heading already tells screen readers. */}
          <span aria-hidden="true">{ARROWS[direction] ?? '↕'}</span>
        </button>
      </span>
    </th>
  );
}

// A table of tasks. The Description, Priority, Due and Created headings sort the list.
function TaskList({
  tasks,
  totalCount,
  sort,
  onSort,
  onToggle,
  onEdit,
  onPriorityChange,
  onUpdate,
  onDelete,
  onMove,
  onFilterTag,
  onAddStep,
  depths,
  stepCounts,
  today,
}) {
  const emptyMessage =
    totalCount === 0 ? 'No tasks yet. Add one above!' : 'No tasks match this filter.';
  const sortProps = { sort, onSort };
  // The task being dragged, and the rows in the order they are shown while it is dragged.
  const [dragId, setDragId] = useState(null);
  const [liveTasks, setLiveTasks] = useState(null);

  // While dragging, the rows are already in their new order so the others make way in real time.
  // Each row passed over swaps places with the dragged one, starting from the order on screen,
  // so dragging back over a row undoes the move. The order is only saved on drop.
  const shownTasks = liveTasks ?? tasks;

  function startDrag(id) {
    setDragId(id);
    setLiveTasks(tasks);
  }

  function endDrag() {
    setDragId(null);
    setLiveTasks(null);
  }

  // Drop saves the order on screen: the dragged task goes to the place it is shown in.
  function handleDrop() {
    if (dragId !== null && liveTasks) {
      const target = tasks[liveTasks.findIndex((task) => task.id === dragId)];
      if (target) onMove(dragId, target.id);
    }
    endDrag();
  }

  return (
    <div className="table-wrap">
      <table className="task-table">
        <thead>
          <tr>
            <th scope="col" className="col-drag"><span className="visually-hidden">Reorder</span></th>
            <th scope="col" className="col-done">Done</th>
            <SortableHeader label="Description" columnKey="description" className="col-description" {...sortProps} />
            <SortableHeader label="Priority" columnKey="priority" className="col-priority" {...sortProps} />
            <SortableHeader label="Due" columnKey="due" className="col-due" {...sortProps} />
            <SortableHeader label="Created" columnKey="created" className="col-created" {...sortProps} />
            <th scope="col" className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {shownTasks.map((task, index) => (
            // key helps React track which row is which when the list changes.
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onEdit={onEdit}
              onPriorityChange={onPriorityChange}
              onUpdate={onUpdate}
              onFilterTag={onFilterTag}
              onAddStep={onAddStep}
              depth={depths?.get(task.id) ?? 0}
              stepCount={stepCounts?.get(task.id)}
              today={today}
              onDelete={onDelete}
              isDragging={dragId === task.id}
              onDragStart={() => startDrag(task.id)}
              // The dragged row passing under the pointer is ignored; any other row swaps with it.
              onDragOver={() =>
                dragId !== null && dragId !== task.id && setLiveTasks((rows) => moveTask(rows, dragId, task.id))
              }
              onDrop={handleDrop}
              onDragEnd={endDrag}
              // Keyboard users move a task one place among the rows they can see.
              onStep={(offset) => {
                const neighbour = tasks[index + offset];
                if (neighbour) onMove(task.id, neighbour.id);
              }}
            />
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={7} className="empty-message">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TaskList;
