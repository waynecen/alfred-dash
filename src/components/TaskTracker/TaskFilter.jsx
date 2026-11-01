const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

function TaskFilter({ filter, onChange }) {
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
        </button>
      ))}
    </div>
  );
}

export default TaskFilter;
