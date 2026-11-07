import useLocalStorage from './useLocalStorage';
import { createGoal } from '../data/goals';
import insertAt from '../utils/insertAt';

// The goals, and everything that changes them. Like useTasks, every change is a functional
// update, so two changes in the same moment never undo each other.
//   notify: shows a toast, for reaching a goal and for Undo after a delete
function useGoals(notify) {
  const [goals, setGoals] = useLocalStorage('goals', []);

  // fields: as for createGoal. Returns the new goal's id.
  function addGoal(fields) {
    const now = Date.now();
    let id;
    setGoals((current) => {
      id = Math.max(now, ...current.map((goal) => goal.id + 1));
      return [...current, createGoal(fields, id, now)];
    });
    return id;
  }

  function updateGoal(id, fields) {
    setGoals((current) => current.map((goal) => (goal.id === id ? { ...goal, ...fields } : goal)));
  }

  // Moves a count goal on (or back) by some amount, never below zero, and says so when that
  // reaches the target.
  function stepGoal(id, by) {
    let reached = null;
    setGoals((current) =>
      current.map((goal) => {
        if (goal.id !== id) return goal;
        const progress = Math.max(0, goal.progress + by);
        if (goal.progress < goal.target && progress >= goal.target) reached = goal;
        return { ...goal, progress };
      })
    );
    if (reached) notify({ message: `Goal reached: “${reached.title}”` });
  }

  function deleteGoal(id) {
    const index = goals.findIndex((goal) => goal.id === id);
    if (index === -1) return;
    const goal = goals[index];
    setGoals((current) => current.filter((g) => g.id !== id));
    notify({
      message: `Deleted “${goal.title}”`,
      actionLabel: 'Undo',
      onAction: () => setGoals((current) => (current.some((g) => g.id === id) ? current : insertAt(current, index, goal))),
    });
  }

  return { goals, actions: { addGoal, updateGoal, stepGoal, deleteGoal } };
}

export default useGoals;
