// @vitest-environment node
import { ASSISTANT_TOOLS, checkToolInput } from './assistantTools.js';

describe('assistant tools', () => {
  it('are each a named, described tool with an object schema, streamed as written', () => {
    for (const tool of ASSISTANT_TOOLS) {
      expect(tool).toMatchObject({ name: expect.any(String), description: expect.any(String), eager_input_streaming: true });
      expect(tool.input_schema.type).toBe('object');
    }
  });

  it('accepts a sound proposal, leaving out fields no tool knows', () => {
    expect(checkToolInput('add_event', { title: 'Dentist', date: '2026-11-13', start: '15:00', mood: 'meh' })).toEqual({
      input: { title: 'Dentist', date: '2026-11-13', start: '15:00' },
    });
    expect(checkToolInput('update_task', { task_id: 3, due_date: null })).toEqual({ input: { task_id: 3, due_date: null } });
  });

  it.each([
    ['an unknown tool', 'drop_tables', {}],
    ['a missing field', 'complete_task', {}],
    ['a wrong type', 'complete_task', { task_id: '3' }],
    ['a date in another form', 'add_event', { title: 'Lunch', date: '13/11/2026' }],
    ['an end before its start', 'add_event', { title: 'Lunch', date: '2026-11-13', start: '13:00', end: '12:00' }],
    ['an empty text', 'append_note', { text: '   ' }],
    ['a change that changes nothing', 'update_task', { task_id: 3 }],
    ['too many tasks', 'add_tasks', { tasks: Array.from({ length: 21 }, () => ({ text: 'x' })) }],
    ['a tag with a space', 'add_tasks', { tasks: [{ text: 'x', tags: ['two words'] }] }],
  ])('turns down %s', (_name, tool, input) => {
    expect(checkToolInput(tool, input)).toEqual({ error: expect.any(String) });
  });
});
