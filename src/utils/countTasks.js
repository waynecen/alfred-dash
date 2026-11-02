// How many tasks are still open and how many are done, plus how many open tasks
// there are at each priority, e.g. { active: 3, completed: 1, openByPriority: { high: 2, medium: 1, low: 0 } }.
function countTasks(tasks) {
  const open = tasks.filter((task) => !task.completed);
  const openByPriority = { high: 0, medium: 0, low: 0 };

  for (const task of open) {
    // Tasks saved before priorities existed have none, so they count as medium.
    const priority = task.priority in openByPriority ? task.priority : 'medium';
    openByPriority[priority] += 1;
  }

  return {
    active: open.length,
    completed: tasks.length - open.length,
    openByPriority,
  };
}

export default countTasks;
