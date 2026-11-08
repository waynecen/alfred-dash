import useCollection from './useCollection';
import useLocalStorage from './useLocalStorage';
import { createHabit, normalizeSchedule } from '../data/habits';
import { toISODate } from '../utils/dates';

// The habits, the days each was done, and everything that changes them.
//   notify: shows a toast, used to offer Undo after archiving or deleting
function useHabits(notify) {
  const { items: habits, add, update, remove } = useCollection('habits', notify, (habit) => habit.name);
  const [habitLog, setLog] = useLocalStorage('habitLog', {});

  function updateHabit(id, fields) {
    update(id, 'schedule' in fields ? { ...fields, schedule: normalizeSchedule(fields.schedule) } : fields);
  }

  // Marks a day done, or not done again. Returns whether it is done now.
  function toggleHabitDay(id, date = toISODate()) {
    let done = false;
    setLog((current) => {
      const days = current[id] ?? [];
      done = !days.includes(date);
      return { ...current, [id]: done ? [...days, date].sort() : days.filter((day) => day !== date) };
    });
    return done;
  }

  // Archiving keeps the days done, so a habit can come back with its streak intact.
  function archiveHabit(id, archived = true) {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    update(id, { archived });
    if (archived) {
      notify({ message: `Archived “${habit.name}”`, actionLabel: 'Undo', onAction: () => update(id, { archived: false }) });
    }
  }

  // Deleting forgets the days done too; Undo brings both back.
  function deleteHabit(id) {
    const days = habitLog[id];
    const habit = remove(id, { onUndo: () => days && setLog((current) => ({ ...current, [id]: days })) });
    if (habit) setLog(({ [id]: _gone, ...rest }) => rest);
  }

  return {
    habits,
    habitLog,
    actions: {
      // fields: { name, schedule }. Returns the new habit's id.
      addHabit: (fields) => add((id, now) => createHabit(fields, id, now)),
      updateHabit,
      toggleHabitDay,
      archiveHabit,
      deleteHabit,
    },
  };
}

export default useHabits;
