import useLocalStorage from './useLocalStorage';
import { createTask, describeNext, nextTaskFields } from '../data/tasks';
import insertAt from '../utils/insertAt';
import { toISODate } from '../utils/dates';

// The task list, saved in the browser, and everything that changes it. Every change is a
// functional update, so changes made in the same moment (by a widget, the AI, a timer) never
// overwrite each other.
//   notify: shows a toast (from useToasts), used to offer Undo after a delete or a repeat
function useTasks(notify) {
  const [tasks, setTasks] = useLocalStorage('tasks', []);

  // Changes one task, by id, with a function from the task to its new fields.
  const update = (id, change) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...change(task) } : task)));

  // Adds several tasks at once: items is [{ text, priority, ...any other task fields }].
  function addTasks(items) {
    if (items.length === 0) return;
    const now = Date.now();
    setTasks((current) => {
      // Ids are timestamps; step past any already taken so a batch never repeats one.
      let nextId = Math.max(now, ...current.map((task) => task.id + 1));
      return [...current, ...items.map((item) => createTask(item, nextId++, now))];
    });
  }

  // extra: any other task fields, e.g. { dueDate, tags, recurrence } from quick-add.
  function addTask(text, priority, extra = {}) {
    addTasks([{ ...extra, text, priority }]);
  }

  // Ticking off a repeating task also adds its next occurrence, just below it, and says when
  // that is due. Undo takes the next one away and reopens this one. Unticking a done task never
  // removes the next one, which may have been changed since.
  function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const now = Date.now();
    if (task.completed || !task.recurrence) {
      update(id, (t) => ({ completed: !t.completed, completedAt: t.completed ? null : now }));
      return;
    }

    const today = toISODate(now);
    const fields = nextTaskFields(task, today);
    let nextId;
    setTasks((current) => {
      const index = current.findIndex((t) => t.id === id);
      // Already done in the meantime (another tab, a double click): nothing more to add.
      if (index === -1 || current[index].completed) return current;
      nextId = Math.max(now, ...current.map((t) => t.id + 1));
      const done = current.map((t) => (t.id === id ? { ...t, completed: true, completedAt: now } : t));
      return insertAt(done, index + 1, createTask(fields, nextId, now));
    });
    if (nextId === undefined) return;
    notify({
      message: `Done. Next: ${describeNext(fields.dueDate, today)}`,
      actionLabel: 'Undo',
      onAction: () =>
        setTasks((current) =>
          current
            .filter((t) => t.id !== nextId)
            .map((t) => (t.id === id ? { ...t, completed: false, completedAt: null } : t))
        ),
    });
  }

  function editTask(id, text) {
    update(id, () => ({ text }));
  }

  function changePriority(id, priority) {
    update(id, () => ({ priority }));
  }

  // Sets any of a task's fields, e.g. updateTask(id, { dueDate: '2026-11-13' }).
  function updateTask(id, fields) {
    update(id, () => fields);
  }

  // Deleting a task deletes its steps too, and Undo brings them all back where they were.
  function deleteTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const gone = (t) => t.id === id || t.parentId === id;
    // Each removed task with its place, first to last, so putting them back in that order
    // returns every one to its own place.
    const removed = tasks.flatMap((t, index) => (gone(t) ? [{ t, index }] : []));
    setTasks((current) => current.filter((t) => !gone(t)));
    const steps = removed.length - 1;
    notify({
      message: steps > 0 ? `Deleted “${task.text}” and ${steps} step${steps === 1 ? '' : 's'}` : `Deleted “${task.text}”`,
      actionLabel: 'Undo',
      // Functional updates, so anything done since the delete is kept.
      onAction: () =>
        setTasks((current) =>
          removed.reduce(
            (list, { t, index }) => (list.some((other) => other.id === t.id) ? list : insertAt(list, index, t)),
            current
          )
        ),
    });
  }

  // newTasks: the whole list in its new order (the Tasks widget works out the move).
  function reorderTasks(newTasks) {
    setTasks(newTasks);
  }

  return {
    tasks,
    actions: { addTask, addTasks, toggleTask, editTask, changePriority, updateTask, deleteTask, reorderTasks },
  };
}

export default useTasks;
