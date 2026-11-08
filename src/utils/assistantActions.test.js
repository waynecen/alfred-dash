import { vi } from 'vitest';
import { ACTIONS, actionFor } from './assistantActions';
import { IDLE } from '../data/focus';

const data = {
  today: '2026-11-07',
  hour: { hourCycle: 'h23' },
  tasks: [
    { id: 1, text: 'Plan trip', priority: 'high', completed: false, dueDate: '2026-11-08', parentId: null },
    { id: 2, text: 'Book flights', priority: 'medium', completed: false, parentId: 1 },
    { id: 3, text: 'Done already', priority: 'low', completed: true, parentId: null },
    { id: 4, text: 'Water plants', priority: 'medium', completed: false, parentId: null, recurrence: { every: 'week', interval: 1 } },
  ],
  habits: [
    { id: 7, name: 'Read', schedule: 'daily', archived: false },
    { id: 8, name: 'Old habit', schedule: 'daily', archived: true },
  ],
  habitLog: { 7: ['2026-11-06'] },
  focus: { ...IDLE, lengths: { work: 25 } },
};

function makeActions() {
  return {
    addTasks: vi.fn((items) => items.map((_, i) => 100 + i)),
    updateTask: vi.fn(),
    completeTasks: vi.fn(),
    addEvent: vi.fn(() => 55),
    toggleHabitDay: vi.fn(),
    focusTimer: { start: vi.fn() },
    setNotes: vi.fn(),
  };
}

describe('assistant actions', () => {
  it('adds tasks as steps under their task, taking its priority', () => {
    const input = { tasks: [{ text: 'Pack', parent_id: 1 }, { text: 'Visa', parent_id: 1, due_date: '2026-11-09', tags: ['Travel'] }] };
    expect(ACTIONS.add_tasks.describe(input, data)).toEqual({
      title: 'Add 2 tasks under “Plan trip”',
      details: ['Pack', 'Visa · Mon · #travel'],
    });
    const actions = makeActions();
    expect(ACTIONS.add_tasks.apply(input, actions, data)).toBe('Added “Pack” (id 100), “Visa” (id 101).');
    expect(actions.addTasks).toHaveBeenCalledWith([
      { text: 'Pack', priority: 'high', dueDate: null, tags: [], parentId: 1 },
      { text: 'Visa', priority: 'high', dueDate: '2026-11-09', tags: ['travel'], parentId: 1 },
    ]);
  });

  it('won’t add steps under a step, or under a task that is done', () => {
    expect(ACTIONS.add_tasks.problem({ tasks: [{ text: 'x', parent_id: 2 }] }, data)).toMatch(/steps can’t have steps/);
    expect(ACTIONS.add_tasks.problem({ tasks: [{ text: 'x', parent_id: 3 }] }, data)).toMatch(/no longer open/);
    expect(ACTIONS.add_tasks.problem({ tasks: [{ text: 'x' }] }, data)).toBeNull();
  });

  it('describes a change against how the task is now, and clears a due date', () => {
    const input = { task_id: 1, due_date: null, priority: 'low' };
    expect(ACTIONS.update_task.describe(input, data).details).toEqual(['No due date (was Tomorrow)', 'Priority: low (was high)']);
    const actions = makeActions();
    ACTIONS.update_task.apply(input, actions, data);
    expect(actions.updateTask).toHaveBeenCalledWith(1, { priority: 'low', dueDate: null });
    expect(ACTIONS.update_task.problem({ task_id: 99, text: 'x' }, data)).toMatch(/no longer on the list/);
  });

  it('ticks a task off quietly, mentioning when it repeats', () => {
    expect(ACTIONS.complete_task.describe({ task_id: 4 }, data).details).toEqual(['It repeats: the next one is added']);
    expect(ACTIONS.complete_task.problem({ task_id: 3 }, data)).toMatch(/already done/);
    const actions = makeActions();
    ACTIONS.complete_task.apply({ task_id: 4 }, actions, data);
    expect(actions.completeTasks).toHaveBeenCalledWith([4], { quiet: true });
  });

  it('adds an event, and says when it is', () => {
    const input = { title: 'Dentist', date: '2026-11-13', start: '15:00' };
    expect(ACTIONS.add_event.describe(input, data).details).toEqual(['Fri · 15:00']);
    const actions = makeActions();
    expect(ACTIONS.add_event.apply(input, actions, data)).toBe('Added the event “Dentist” (id 55).');
    expect(actions.addEvent).toHaveBeenCalledWith({ title: 'Dentist', date: '2026-11-13', start: '15:00', end: null });
  });

  it('ticks off a kept habit not yet done that day, and nothing ahead of time', () => {
    expect(ACTIONS.log_habit.problem({ habit_id: 7 }, data)).toBeNull();
    expect(ACTIONS.log_habit.problem({ habit_id: 7, date: '2026-11-06' }, data)).toMatch(/already ticked off/);
    expect(ACTIONS.log_habit.problem({ habit_id: 8 }, data)).toMatch(/no longer kept/);
    expect(ACTIONS.log_habit.problem({ habit_id: 7, date: '2026-11-09' }, data)).toMatch(/ahead of time/);
    const actions = makeActions();
    ACTIONS.log_habit.apply({ habit_id: 7 }, actions, data);
    expect(actions.toggleHabitDay).toHaveBeenCalledWith(7, '2026-11-07');
  });

  it('starts a focus session only when the timer is free', () => {
    expect(ACTIONS.start_focus.describe({ task_id: 1 }, data).details).toEqual(['25 minutes on “Plan trip”']);
    expect(ACTIONS.start_focus.problem({}, { ...data, focus: { ...data.focus, endsAt: 1 } })).toMatch(/already going/);
    const actions = makeActions();
    ACTIONS.start_focus.apply({ task_id: 1 }, actions, data);
    expect(actions.focusTimer.start).toHaveBeenCalledWith(1);
  });

  it('adds to the end of the notes, after a blank line', () => {
    const actions = makeActions();
    ACTIONS.append_note.apply({ text: 'Call Sam' }, actions, data);
    const update = actions.setNotes.mock.calls[0][0];
    expect(update('Shopping list  \n')).toBe('Shopping list\n\nCall Sam');
    expect(update('')).toBe('Call Sam');
  });

  it('knows nothing of tools it wasn’t given', () => {
    expect(actionFor('delete_everything')).toBeNull();
  });
});
