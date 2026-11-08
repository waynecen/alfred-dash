import { DAILY, describeSchedule, normalizeSchedule, scheduleDays, weekdayName, weekOrder } from '../../data/habits';
import './WeekdayPicker.css';

// Seven toggles, one per weekday in the order the user's week runs, for the days a habit is due.
// Turning every day on (or off) means every day.
//   value: 'daily' | weekday numbers (0 is Sunday)    onChange(value), in the same form
//   weekStart: 1 for Monday, 0 for Sunday    label: what the group is for, for screen readers
function WeekdayPicker({ value = DAILY, onChange, weekStart = 1, label = 'Days it is due' }) {
  const on = scheduleDays(value);

  function toggle(day) {
    const next = on.includes(day) ? on.filter((d) => d !== day) : [...on, day];
    // Turning off the last day leaves it due every day, as an empty schedule would mean.
    onChange(normalizeSchedule(next));
  }

  return (
    <div className="weekday-picker">
      <div className="weekday-picker-days" role="group" aria-label={label}>
        {weekOrder(weekStart).map((day) => (
          <button
            key={day}
            type="button"
            aria-pressed={value === DAILY || on.includes(day)}
            aria-label={weekdayName(day, 'long')}
            onClick={() => toggle(day)}
          >
            {weekdayName(day, 'narrow')}
          </button>
        ))}
      </div>
      <span className="weekday-picker-summary label" aria-live="polite">
        {describeSchedule(value, weekStart)}
      </span>
    </div>
  );
}

export default WeekdayPicker;
