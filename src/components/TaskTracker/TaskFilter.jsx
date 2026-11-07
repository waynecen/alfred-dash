const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

// By due date. Pressing the chosen one again goes back to any date.
const DUE = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
];

// One row of ruled buttons; the chosen one is filled with ink.
function FilterGroup({ label, items, value, counts, onPick }) {
  return (
    <div className="task-filter" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          // aria-pressed tells screen readers which button is currently on.
          aria-pressed={value === item.value}
          className={value === item.value ? 'active' : ''}
          onClick={() => onPick(item.value)}
        >
          {item.label}
          {counts[item.value] !== undefined && <span className="task-count">{counts[item.value]}</span>}
        </button>
      ))}
    </div>
  );
}

// The controls above the task table.
//   filter: { status, when, tag, query } (see utils/filterTasks.js)
//   counts: { active, completed, overdue, today, upcoming }; "All" has no count
//   tags: [{ tag, count }], every tag in use
//   onChange: called with the parts that changed, e.g. { when: 'today' }
function TaskFilter({ filter, counts, tags = [], onChange }) {
  return (
    <div className="task-filters">
      <FilterGroup
        label="Filter tasks"
        items={STATUSES}
        value={filter.status}
        counts={counts}
        onPick={(status) => onChange({ status })}
      />
      <FilterGroup
        label="Filter by due date"
        items={DUE}
        value={filter.when}
        counts={counts}
        onPick={(when) => onChange({ when: when === filter.when ? 'any' : when })}
      />
      <div className="task-filter-find">
        {tags.length > 0 && (
          <select
            className="task-filter-tag"
            value={filter.tag}
            onChange={(event) => onChange({ tag: event.target.value })}
            aria-label="Filter by tag"
          >
            <option value="">All tags</option>
            {tags.map(({ tag, count }) => (
              <option key={tag} value={tag}>
                #{tag} ({count})
              </option>
            ))}
          </select>
        )}
        <input
          type="search"
          className="task-filter-search"
          value={filter.query}
          onChange={(event) => onChange({ query: event.target.value })}
          placeholder="Search"
          aria-label="Search tasks"
        />
      </div>
    </div>
  );
}

export default TaskFilter;
