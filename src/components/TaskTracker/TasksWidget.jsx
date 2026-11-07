import { useState } from 'react';
import TaskForm from './TaskForm';
import TaskFilter from './TaskFilter';
import TaskList from './TaskList';
import countTasks, { countDue, countTags } from '../../utils/countTasks';
import filterTasks from '../../utils/filterTasks';
import sortTasks from '../../utils/sortTasks';
import moveTask from '../../utils/moveTask';
import groupTasks, { countSteps } from '../../utils/groupTasks';
import useToday from '../../hooks/useToday';
import './TaskTracker.css';

const NO_FILTER = { status: 'all', when: 'any', tag: '', query: '' };

// The content of the Tasks widget. The card and title come from <Widget>.
function TasksWidget({ tasks, onAdd, onToggle, onEdit, onPriorityChange, onUpdate, onDelete, onReorder }) {
  // Due labels ("Today", "Tomorrow") and the due filters move on at midnight.
  const today = useToday();
  // The filter and sort are temporary UI state, so plain useState is enough (no need to save them).
  const [filter, setFilter] = useState(NO_FILTER);
  // null means "the order tasks were added in"; otherwise { key, direction }.
  const [sort, setSort] = useState(null);

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

  return (
    <div className="task-tracker">
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
        today={today}
        onDelete={onDelete}
        onMove={handleMove}
      />
    </div>
  );
}

export default TasksWidget;
