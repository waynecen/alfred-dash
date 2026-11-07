import useLocalStorage from './useLocalStorage';
import { createTask } from '../data/tasks';

// Puts an item back at the index it was taken from (or at the end, if the list got shorter).
const insertAt = (list, index, item) => [...list.slice(0, index), item, ...list.slice(index)];

// The task list, saved in the browser, and everything that changes it. Every change is a
// functional update, so changes made in the same moment (by a widget, the AI, a timer) never
// overwrite each other.
//   notify: shows a toast (from useToasts), used to offer Undo after a delete
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

  function addTask(text, priority) {
    addTasks([{ text, priority }]);
  }

  function toggleTask(id) {
    update(id, (task) => ({
      completed: !task.completed,
      completedAt: task.completed ? null : Date.now(),
    }));
  }

  function editTask(id, text) {
    update(id, () => ({ text }));
  }

  function changePriority(id, priority) {
    update(id, () => ({ priority }));
  }

  function deleteTask(id) {
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) return;
    const task = tasks[index];
    setTasks((current) => current.filter((t) => t.id !== id));
    notify({
      message: `Deleted “${task.text}”`,
      actionLabel: 'Undo',
      // Functional updates, so anything done since the delete is kept.
      onAction: () =>
        setTasks((current) => (current.some((t) => t.id === id) ? current : insertAt(current, index, task))),
    });
  }

  // newTasks: the whole list in its new order (the Tasks widget works out the move).
  function reorderTasks(newTasks) {
    setTasks(newTasks);
  }

  return {
    tasks,
    actions: { addTask, addTasks, toggleTask, editTask, changePriority, deleteTask, reorderTasks },
  };
}

export default useTasks;
