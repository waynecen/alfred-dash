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

  // Marks the open tasks among ids done. A repeating one also gets its next occurrence, just
  // below it. Returns the next occurrences added, [{ id, dueDate }], and the ids it ticked off,
  // so Undo can take exactly those back. Tasks already done (in another tab, by a double click)
  // are left alone.
  function complete(ids) {
    const now = Date.now();
    const today = toISODate(now);
    const wanted = new Set(ids);
    let added = [];
    let ticked = [];
    setTasks((current) => {
      added = [];
      ticked = [];
      let nextId = Math.max(now, ...current.map((t) => t.id + 1));
      const list = [];
      for (const task of current) {
        if (!wanted.has(task.id) || task.completed) {
          list.push(task);
          continue;
        }
        ticked.push(task.id);
        list.push({ ...task, completed: true, completedAt: now });
        if (task.recurrence) {
          const next = createTask(nextTaskFields(task, today), nextId++, now);
          added.push({ id: next.id, dueDate: next.dueDate });
          list.push(next);
        }
      }
      return ticked.length > 0 ? list : current;
    });
    const undo = () => {
      const reopen = new Set(ticked);
      const extra = new Set(added.map((next) => next.id));
      setTasks((current) =>
        current
          .filter((t) => !extra.has(t.id))
          .map((t) => (reopen.has(t.id) ? { ...t, completed: false, completedAt: null } : t))
      );
    };
    return { added, ticked, today, undo };
  }

  // Ticking off a repeating task also adds its next occurrence and says when that is due, with
  // Undo. Unticking a done task never removes the next one, which may have been changed since.
  function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.completed) {
      update(id, () => ({ completed: false, completedAt: null }));
      return;
    }
    const { added, today, undo } = complete([id]);
    if (added.length === 0) return; // a plain task: the ticked box says it all
    notify({ message: `Done. Next: ${describeNext(added[0].dueDate, today)}`, actionLabel: 'Undo', onAction: undo });
  }

  // Ticks off several tasks at once, with one Undo for all of them.
  function completeTasks(ids) {
    const { ticked, undo } = complete(ids);
    if (ticked.length === 0) return;
    notify({ message: `Completed ${plural(ticked.length, 'task')}`, actionLabel: 'Undo', onAction: undo });
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

  // Sets the same fields on several tasks, e.g. a new due date, with one Undo for all of them.
  function updateTasks(ids, fields) {
    const wanted = new Set(ids);
    const before = new Map(
      tasks.filter((t) => wanted.has(t.id)).map((t) => [t.id, Object.fromEntries(Object.keys(fields).map((k) => [k, t[k]]))])
    );
    if (before.size === 0) return;
    setTasks((current) => current.map((t) => (wanted.has(t.id) ? { ...t, ...fields } : t)));
    notify({
      message: `Changed ${plural(before.size, 'task')}`,
      actionLabel: 'Undo',
      onAction: () => setTasks((current) => current.map((t) => (before.has(t.id) ? { ...t, ...before.get(t.id) } : t))),
    });
  }

  // Deleting a task deletes its steps too, and Undo brings them all back where they were.
  function deleteTask(id) {
    deleteTasks([id]);
  }

  // Deletes several tasks (and their steps) at once, with one Undo for all of them.
  //   label: how the toast names them, e.g. "3 completed tasks"; by default it counts them
  function deleteTasks(ids, label) {
    const wanted = new Set(ids);
    const gone = (t) => wanted.has(t.id) || wanted.has(t.parentId);
    // Each removed task with its place, first to last, so putting them back in that order
    // returns every one to its own place.
    const removed = tasks.flatMap((t, index) => (gone(t) ? [{ t, index }] : []));
    if (removed.length === 0) return;
    setTasks((current) => current.filter((t) => !gone(t)));
    const named = removed.filter(({ t }) => wanted.has(t.id));
    const steps = removed.length - named.length;
    const what =
      label ?? (named.length === 1 ? `“${named[0].t.text}”` : plural(named.length, 'task'));
    notify({
      message: `Deleted ${what}${steps > 0 ? ` and ${plural(steps, 'step')}` : ''}`,
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
    actions: {
      addTask,
      addTasks,
      toggleTask,
      completeTasks,
      editTask,
      changePriority,
      updateTask,
      updateTasks,
      deleteTask,
      deleteTasks,
      reorderTasks,
    },
  };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default useTasks;
