import { useState } from 'react';
import TaskItem from './TaskItem';

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

// A table of tasks. The Description, Priority and Created headings sort the list.
function TaskList({
  tasks,
  totalCount,
  sort,
  onSort,
  onToggle,
  onEdit,
  onPriorityChange,
  onDelete,
  onMove,
}) {
  const emptyMessage =
    totalCount === 0 ? 'No tasks yet. Add one above!' : 'No tasks match this filter.';
  const sortProps = { sort, onSort };
  // The task being dragged and the row it is currently over, for the highlight.
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  function endDrag() {
    setDragId(null);
    setOverId(null);
  }

  function handleDrop(targetId) {
    if (dragId !== null) onMove(dragId, targetId);
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
            <SortableHeader label="Created" columnKey="created" className="col-created" {...sortProps} />
            <th scope="col" className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            // key helps React track which row is which when the list changes.
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onEdit={onEdit}
              onPriorityChange={onPriorityChange}
              onDelete={onDelete}
              isDragging={dragId === task.id}
              isOver={overId === task.id && dragId !== task.id}
              onDragStart={() => setDragId(task.id)}
              onDragOver={() => dragId !== null && setOverId(task.id)}
              onDrop={() => handleDrop(task.id)}
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
              <td colSpan={6} className="empty-message">
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
