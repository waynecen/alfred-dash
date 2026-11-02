// Picks the tasks to show for a status: 'all' | 'active' | 'completed'.
function filterTasks(tasks, { status = 'all' }) {
  return tasks.filter((task) => {
    if (status === 'active') return !task.completed;
    if (status === 'completed') return task.completed;
    return true; // 'all'
  });
}

export default filterTasks;
