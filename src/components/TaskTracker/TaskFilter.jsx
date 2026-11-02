const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

// counts looks like { active: 2, completed: 1 }. "All" has no count, so it's skipped.
function TaskFilter({ filter, counts, onChange }) {
  return (
    <div className="task-filter" role="group" aria-label="Filter tasks">
      {FILTERS.map((item) => (
        <button
          key={item.value}
          type="button"
          // aria-pressed tells screen readers which button is currently on.
          aria-pressed={filter === item.value}
          className={filter === item.value ? 'active' : ''}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {counts[item.value] !== undefined && (
            <span className="task-count">{counts[item.value]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default TaskFilter;
