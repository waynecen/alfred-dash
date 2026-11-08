import { parseISODate, relativeDay } from './dates';
import { parseTags } from '../data/tasks';
import { describeEventTime } from '../data/events';
import { doneOn } from '../data/habits';
import { isRunning, isPaused } from '../data/focus';

// How each change the assistant can propose (server/assistantTools.js) is shown and carried out.
// The proxy has checked each proposal's input against its tool; what is checked here is whether
// what it names is still there and can take the change: a task deleted since, a habit archived.
//   describe(input, data): { title, details: [line, …] } for its card
//   problem(input, data): why it can't be applied as things are now, or null
//   apply(input, actions, data): carries it out; returns what to tell Claude was done
//   keys: the saved lists it changes, so Undo can put them back as they were
// data: { tasks, events, habits, habitLog, focus, notes, today, hour }
// actions: the dashboard's actions (addTasks, updateTask, completeTasks, addEvent, toggleHabitDay,
//   focusTimer, setNotes)

const quote = (text, max = 60) => `“${text.length > max ? `${text.slice(0, max - 1)}…` : text}”`;
const when = (iso, data) => relativeDay(iso, parseISODate(data.today));
const findTask = (data, id) => data.tasks.find((task) => task.id === id);
const tagsOf = (tags) => parseTags(tags.join(' '));

// The details of one task as a card shows them: "Call the bank · Fri · high · #home".
function taskLine(task, data) {
  return [
    task.text,
    task.due_date && when(task.due_date, data),
    task.priority && task.priority !== 'medium' && task.priority,
    task.tags?.length && tagsOf(task.tags).map((tag) => `#${tag}`).join(' '),
  ]
    .filter(Boolean)
    .join(' · ');
}

export const ACTIONS = {
  add_tasks: {
    keys: ['tasks'],
    describe(input, data) {
      const parents = [...new Set(input.tasks.map((task) => task.parent_id).filter(Boolean))].map((id) => findTask(data, id));
      const n = input.tasks.length;
      const under = parents.length === 1 && parents[0] ? ` under ${quote(parents[0].text, 40)}` : '';
      return { title: `${n === 1 ? 'Add a task' : `Add ${n} tasks`}${under}`, details: input.tasks.map((task) => taskLine(task, data)) };
    },
    problem(input, data) {
      for (const task of input.tasks) {
        if (task.parent_id == null) continue;
        const parent = findTask(data, task.parent_id);
        if (!parent || parent.completed) return 'the task to add steps under is no longer open';
        if (parent.parentId != null) return 'steps can’t have steps of their own';
      }
      return null;
    },
    apply(input, actions, data) {
      const ids = actions.addTasks(
        input.tasks.map((task) => ({
          text: task.text.trim(),
          priority: task.priority ?? findTask(data, task.parent_id)?.priority ?? 'medium',
          dueDate: task.due_date ?? null,
          tags: task.tags ? tagsOf(task.tags) : [],
          parentId: task.parent_id ?? null,
        }))
      );
      return `Added ${input.tasks.map((task, i) => `${quote(task.text)} (id ${ids[i]})`).join(', ')}.`;
    },
  },

  update_task: {
    keys: ['tasks'],
    describe(input, data) {
      const task = findTask(data, input.task_id);
      const details = [];
      if (input.text) details.push(`Text: ${quote(input.text)}`);
      if (input.due_date !== undefined) {
        const was = task?.dueDate ? ` (was ${when(task.dueDate, data)})` : '';
        details.push(input.due_date ? `Due: ${when(input.due_date, data)}${was}` : `No due date${was}`);
      }
      if (input.priority) details.push(`Priority: ${input.priority}${task ? ` (was ${task.priority ?? 'medium'})` : ''}`);
      if (input.tags) details.push(`Tags: ${tagsOf(input.tags).map((tag) => `#${tag}`).join(' ') || 'none'}`);
      return { title: `Change ${task ? quote(task.text, 40) : 'a task'}`, details };
    },
    problem: (input, data) => (findTask(data, input.task_id) ? null : 'that task is no longer on the list'),
    apply(input, actions, data) {
      const fields = {};
      if (input.text) fields.text = input.text.trim();
      if (input.priority) fields.priority = input.priority;
      if (input.due_date !== undefined) fields.dueDate = input.due_date;
      if (input.tags) fields.tags = tagsOf(input.tags);
      actions.updateTask(input.task_id, fields);
      return `Changed ${quote(findTask(data, input.task_id).text)}.`;
    },
  },

  complete_task: {
    keys: ['tasks'],
    describe(input, data) {
      const task = findTask(data, input.task_id);
      return {
        title: `Tick off ${task ? quote(task.text, 40) : 'a task'}`,
        details: task?.recurrence ? ['It repeats: the next one is added'] : [],
      };
    },
    problem(input, data) {
      const task = findTask(data, input.task_id);
      if (!task) return 'that task is no longer on the list';
      return task.completed ? 'that task is already done' : null;
    },
    apply(input, actions, data) {
      actions.completeTasks([input.task_id], { quiet: true });
      return `Ticked off ${quote(findTask(data, input.task_id).text)}.`;
    },
  },

  add_event: {
    keys: ['events'],
    describe: (input, data) => ({
      title: `Add event ${quote(input.title, 40)}`,
      details: [`${when(input.date, data)} · ${describeEventTime({ start: input.start, end: input.end }, data.hour)}`],
    }),
    problem: () => null,
    apply(input, actions) {
      const id = actions.addEvent({ title: input.title.trim(), date: input.date, start: input.start ?? null, end: input.end ?? null });
      return `Added the event ${quote(input.title)} (id ${id}).`;
    },
  },

  log_habit: {
    keys: ['habitLog'],
    describe(input, data) {
      const habit = data.habits.find((h) => h.id === input.habit_id);
      return { title: `Tick off ${habit ? quote(habit.name, 40) : 'a habit'}`, details: [when(input.date ?? data.today, data)] };
    },
    problem(input, data) {
      const habit = data.habits.find((h) => h.id === input.habit_id);
      if (!habit || habit.archived) return 'that habit is no longer kept';
      if ((input.date ?? data.today) > data.today) return 'a habit can’t be ticked off ahead of time';
      return doneOn(data.habitLog, habit, input.date ?? data.today) ? 'it is already ticked off for that day' : null;
    },
    apply(input, actions, data) {
      const date = input.date ?? data.today;
      actions.toggleHabitDay(input.habit_id, date);
      return `Ticked off ${quote(data.habits.find((h) => h.id === input.habit_id).name)} for ${date}.`;
    },
  },

  start_focus: {
    keys: ['focus'],
    describe(input, data) {
      const task = input.task_id && findTask(data, input.task_id);
      const minutes = data.focus?.lengths?.work ?? 25;
      return { title: 'Start a focus session', details: [`${minutes} minutes${task ? ` on ${quote(task.text, 40)}` : ''}`] };
    },
    problem(input, data) {
      if (data.focus && (isRunning(data.focus) || isPaused(data.focus))) return 'the focus timer is already going';
      if (input.task_id && !findTask(data, input.task_id)) return 'that task is no longer on the list';
      return null;
    },
    apply(input, actions, data) {
      actions.focusTimer.start(input.task_id ?? undefined);
      const task = input.task_id && findTask(data, input.task_id);
      return `Started a focus session${task ? ` on ${quote(task.text)}` : ''}.`;
    },
  },

  append_note: {
    keys: ['notes'],
    describe: (input) => ({
      title: 'Add to your notes',
      details: input.text.split('\n').filter((line) => line.trim()).slice(0, 3).map((line) => (line.length > 80 ? `${line.slice(0, 79)}…` : line)),
    }),
    problem: () => null,
    apply(input, actions) {
      const text = input.text.trim();
      actions.setNotes((current) => (current.trim() ? `${current.replace(/\s+$/, '')}\n\n${text}` : text));
      return 'Added to the notes.';
    },
  },
};

// A proposal for a tool the dashboard doesn't know (an older or newer proxy) can only be dismissed.
export const actionFor = (name) => ACTIONS[name] ?? null;
