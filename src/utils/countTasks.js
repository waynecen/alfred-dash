// How many tasks are still open and how many are done.
function countTasks(tasks) {
  return {
    active: tasks.filter((task) => !task.completed).length,
    completed: tasks.filter((task) => task.completed).length,
  };
}

export default countTasks;
