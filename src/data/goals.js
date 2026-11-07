import parseQuickAdd from '../utils/parseQuickAdd';

// The shape of a goal, saved under the 'goals' key.
//   id: number, unique (a timestamp, stepped past any taken)
//   title: string
//   kind: 'count', a number to reach, stepped up by hand ("Read 12 books")
//       | 'tasks', the tasks that carry its tag, done out of all of them ("Launch v2 #launch")
//   target: the number to reach (count goals; null for tasks goals)
//   progress: how far it has come (count goals; tasks goals count their tasks instead)
//   unit: what is counted, e.g. 'books' ('' for none)
//   tag: the tag its tasks carry, without the # (tasks goals; null for count goals)
//   dueDate: 'YYYY-MM-DD' | null, the day to reach it by
//   createdAt: milliseconds

export function createGoal({ title, kind = 'count', target = 1, progress = 0, unit = '', tag = null, dueDate = null }, id, now) {
  const counted = kind === 'count';
  return {
    id,
    title,
    kind,
    target: counted ? Math.max(1, Number(target) || 1) : null,
    progress: counted ? Math.max(0, Number(progress) || 0) : 0,
    unit: counted ? unit : '',
    tag: counted ? null : tag,
    dueDate,
    createdAt: now,
  };
}

// The first number in a title, and the word straight after it: "Read 12 books" is 12 books,
// "Run 100km" is 100 km.
const NUMBER = /(\d+(?:\.\d+)?)\s*([\p{L}%][\p{L}\p{N}%-]*)?/u;

// Reads a goal from one typed line. The title keeps its number ("Read 12 books" stays the title);
// a date is taken out of it, as in quick-add.
//   'Read 12 books by dec 31'  ->  a count goal: 12 books, due 31 December
//   'Launch v2 #launch'         ->  a tasks goal, made of the tasks tagged #launch
//   'Learn to juggle'           ->  a count goal of 1: done, or not yet
//   now, weekStart: as for parseQuickAdd
export function parseGoal(text, { now, weekStart } = {}) {
  const parsed = parseQuickAdd(text, { now, weekStart });
  const title = parsed.text.trim();
  if (parsed.tags.length) {
    return { title: title || `#${parsed.tags[0]}`, kind: 'tasks', tag: parsed.tags[0], dueDate: parsed.dueDate };
  }
  const number = title.match(NUMBER);
  return {
    title,
    kind: 'count',
    target: number ? Number(number[1]) : 1,
    unit: number?.[2] ?? '',
    dueDate: parsed.dueDate,
  };
}

// How far a goal has come: { done, total }. A tasks goal counts every task with its tag, steps
// included, so breaking a task down makes the goal finer, not further away.
export function goalProgress(goal, tasks = []) {
  if (goal.kind === 'tasks') {
    const tagged = tasks.filter((task) => task.tags?.includes(goal.tag));
    return { done: tagged.filter((task) => task.completed).length, total: tagged.length };
  }
  return { done: goal.progress, total: goal.target };
}

export const isReached = ({ done, total }) => total > 0 && done >= total;

const number = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

// How the progress reads: '5 of 12 books', '3 of 8 tasks', '0 of 1'.
export function describeProgress(goal, { done, total }) {
  const unit = goal.kind === 'tasks' ? (total === 1 ? 'task' : 'tasks') : goal.unit;
  return `${number(done)} of ${number(total)}${unit ? ` ${unit}` : ''}`;
}
