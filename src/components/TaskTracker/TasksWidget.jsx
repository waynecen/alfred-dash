import { useState } from 'react';
import TaskForm from './TaskForm';
import TaskFilter from './TaskFilter';
import TaskList from './TaskList';
import TaskFooter from './TaskFooter';
import countTasks, { countDue, countTags } from '../../utils/countTasks';
import filterTasks from '../../utils/filterTasks';
import sortTasks from '../../utils/sortTasks';
import moveTask from '../../utils/moveTask';
import groupTasks, { countSteps } from '../../utils/groupTasks';
import useToday from '../../hooks/useToday';
import './TaskTracker.css';

const NO_FILTER = { status: 'all', when: 'any', tag: '', query: '' };

// The content of the Tasks widget. The card and title come from <Widget>.
//   onCompleteMany, onUpdateMany, onDeleteMany: the same as their one-task versions, for the
//   selected tasks, each with one Undo
function TasksWidget({
  tasks,
  onAdd,
  onToggle,
  onEdit,
  onPriorityChange,
  onUpdate,
  onDelete,
  onReorder,
  onCompleteMany,
  onUpdateMany,
  onDeleteMany,
}) {
  // Due labels ("Today", "Tomorrow") and the due filters move on at midnight.
  const today = useToday();
  // The filter and sort are temporary UI state, so plain useState is enough (no need to save them).
  const [filter, setFilter] = useState(NO_FILTER);
  // null means "the order tasks were added in"; otherwise { key, direction }.
  const [sort, setSort] = useState(null);
  // Tasks picked with Shift- or Ctrl-click, and the last one picked, where a Shift range starts.
  const [selected, setSelected] = useState(() => new Set());
  const [anchorId, setAnchorId] = useState(null);

  const tags = countTags(tasks);
  // A tag filter outlives its tag if the last task with it is deleted or retagged.
  const shownFilter = tags.some(({ tag }) => tag === filter.tag) ? filter : { ...filter, tag: '' };

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
  // Steps sit under their parent, however the list is sorted.
  const rows = groupTasks(sortTasks(filterTasks(tasks, shownFilter, today), sort));
  const visibleTasks = rows.map((row) => row.task);
  const depths = new Map(rows.map((row) => [row.task.id, row.depth]));
  // Only what is on screen counts as selected: a task filtered away or deleted drops out.
  const selectedIds = visibleTasks.filter((task) => selected.has(task.id)).map((task) => task.id);
  // Done tasks to clear, except a done task whose steps aren't all done: clearing it would take
  // its open steps with it.
  const completedIds = tasks
    .filter((task) => task.completed && !tasks.some((step) => step.parentId === task.id && !step.completed))
    .map((task) => task.id);

  // Ctrl-click (Cmd on a Mac) adds or removes one task; Shift-click selects every task on
  // screen from the last one picked to this one.
  function handleSelect(id, { range }) {
    const order = visibleTasks.map((task) => task.id);
    setSelected((current) => {
      const next = new Set(current);
      if (range && anchorId !== null && order.includes(anchorId)) {
        const [from, to] = [order.indexOf(anchorId), order.indexOf(id)].sort((a, b) => a - b);
        order.slice(from, to + 1).forEach((taskId) => next.add(taskId));
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setAnchorId(id);
  }

  function clearSelection() {
    setSelected(new Set());
    setAnchorId(null);
  }

  // Each bulk action applies once, then the selection is done with.
  const bulk = (action) => (ids, ...args) => {
    action(ids, ...args);
    clearSelection();
  };

  return (
    <div
      className="task-tracker"
      onKeyDown={(event) => {
        // Escape lets go of the selection, unless it is cancelling an edit.
        if (event.key === 'Escape' && selectedIds.length > 0 && !event.target.matches('input, textarea, select')) {
          clearSelection();
        }
      }}
    >
      {/* Counts come from ALL tasks, so they stay the same whichever filter is on. */}
      <TaskFilter
        filter={shownFilter}
        counts={{ ...countTasks(tasks), ...countDue(tasks, today) }}
        tags={tags}
        onChange={(patch) => setFilter((current) => ({ ...current, ...patch }))}
      />
      <TaskForm onAdd={onAdd} />
      <TaskList
        tasks={visibleTasks}
        totalCount={tasks.length}
        sort={sort}
        onSort={handleSort}
        onToggle={onToggle}
        onEdit={onEdit}
        onPriorityChange={onPriorityChange}
        onUpdate={onUpdate}
        onFilterTag={(tag) => setFilter((current) => ({ ...current, tag }))}
        // A step starts at its task's priority.
        onAddStep={(parentId, text) =>
          onAdd(text, tasks.find((task) => task.id === parentId)?.priority ?? 'medium', { parentId })
        }
        depths={depths}
        stepCounts={countSteps(tasks)}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        today={today}
        onDelete={onDelete}
        onMove={handleMove}
      />
      {tasks.length > 0 && (
        <TaskFooter
          selectedIds={selectedIds}
          completedIds={completedIds}
          today={today}
          onComplete={bulk(onCompleteMany)}
          onSetDue={bulk((ids, dueDate) => onUpdateMany(ids, { dueDate }))}
          onDelete={bulk(onDeleteMany)}
          onClearCompleted={(ids) => onDeleteMany(ids, `${ids.length} completed task${ids.length === 1 ? '' : 's'}`)}
          onClearSelection={clearSelection}
        />
      )}
    </div>
  );
}

export default TasksWidget;
