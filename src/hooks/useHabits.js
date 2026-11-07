import useLocalStorage from './useLocalStorage';
import { createHabit, normalizeSchedule } from '../data/habits';
import { toISODate } from '../utils/dates';
import insertAt from '../utils/insertAt';

// The habits, the days each was done, and everything that changes them. Like useTasks, every
// change is a functional update, so two changes in the same moment never undo each other.
//   notify: shows a toast, used to offer Undo after archiving or deleting
function useHabits(notify) {
  const [habits, setHabits] = useLocalStorage('habits', []);
  const [habitLog, setLog] = useLocalStorage('habitLog', {});

  const update = (id, fields) => setHabits((current) => current.map((habit) => (habit.id === id ? { ...habit, ...fields } : habit)));

  // fields: { name, schedule }. Returns the new habit's id.
  function addHabit(fields) {
    const now = Date.now();
    let id;
    setHabits((current) => {
      id = Math.max(now, ...current.map((habit) => habit.id + 1));
      return [...current, createHabit(fields, id, now)];
    });
    return id;
  }

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
    const index = habits.findIndex((h) => h.id === id);
    if (index === -1) return;
    const habit = habits[index];
    const days = habitLog[id];
    setHabits((current) => current.filter((h) => h.id !== id));
    setLog(({ [id]: _gone, ...rest }) => rest);
    notify({
      message: `Deleted “${habit.name}”`,
      actionLabel: 'Undo',
      onAction: () => {
        setHabits((current) => (current.some((h) => h.id === id) ? current : insertAt(current, index, habit)));
        if (days) setLog((current) => ({ ...current, [id]: days }));
      },
    });
  }

  return { habits, habitLog, actions: { addHabit, updateHabit, toggleHabitDay, archiveHabit, deleteHabit } };
}

export default useHabits;
