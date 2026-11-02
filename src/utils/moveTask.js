// Moves the task with id `fromId` to where the task with id `toId` is now.
// Works on the full list, so tasks hidden by a filter keep their relative order.
function moveTask(tasks, fromId, toId) {
  const from = tasks.findIndex((task) => task.id === fromId);
  const to = tasks.findIndex((task) => task.id === toId);
  if (from === -1 || to === -1 || from === to) return tasks;

  const result = [...tasks];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}

export default moveTask;
