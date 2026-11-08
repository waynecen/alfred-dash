import useCollection from './useCollection';
import { createGoal } from '../data/goals';

// The goals, and everything that changes them.
//   notify: shows a toast, for reaching a goal and for Undo after a delete
function useGoals(notify) {
  const { items: goals, setItems, add, update, remove } = useCollection('goals', notify, (goal) => goal.title);

  // Moves a count goal on (or back) by some amount, never below zero, and says so when that
  // reaches the target.
  function stepGoal(id, by) {
    let reached = null;
    setItems((current) =>
      current.map((goal) => {
        if (goal.id !== id) return goal;
        const progress = Math.max(0, goal.progress + by);
        if (goal.progress < goal.target && progress >= goal.target) reached = goal;
        return { ...goal, progress };
      })
    );
    if (reached) notify({ message: `Goal reached: “${reached.title}”` });
  }

  return {
    goals,
    actions: {
      // fields: as for createGoal. Returns the new goal's id.
      addGoal: (fields) => add((id, now) => createGoal(fields, id, now)),
      updateGoal: update,
      stepGoal,
      deleteGoal: (id) => void remove(id),
    },
  };
}

export default useGoals;
