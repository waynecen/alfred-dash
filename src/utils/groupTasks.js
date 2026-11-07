// Puts each step (a task with a parentId) straight under its parent, in the order given, and
// marks how deep each row sits: [{ task, depth: 0 | 1 }]. A step whose parent isn't in the list
// (filtered out, or deleted) stays where it is, as a row of its own, so a search still finds it.
// Steps are one level deep: a step's own steps are not nested further.
function groupTasks(tasks) {
  const shown = new Set(tasks.map((task) => task.id));
  const stepsOf = new Map();
  for (const task of tasks) {
    if (task.parentId != null && shown.has(task.parentId)) {
      if (!stepsOf.has(task.parentId)) stepsOf.set(task.parentId, []);
      stepsOf.get(task.parentId).push(task);
    }
  }

  const rows = [];
  for (const task of tasks) {
    if (task.parentId != null && shown.has(task.parentId)) continue; // placed under its parent
    rows.push({ task, depth: 0 });
    for (const step of stepsOf.get(task.id) ?? []) rows.push({ task: step, depth: 1 });
  }
  return rows;
}

// How far along each task's steps are, from the whole list: Map(parentId -> { done, total }).
export function countSteps(tasks) {
  const steps = new Map();
  for (const task of tasks) {
    if (task.parentId == null) continue;
    const count = steps.get(task.parentId) ?? { done: 0, total: 0 };
    count.total += 1;
    if (task.completed) count.done += 1;
    steps.set(task.parentId, count);
  }
  return steps;
}

export default groupTasks;
