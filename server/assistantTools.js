// The changes the dashboard assistant may propose. None of them runs here: each tool call goes to
// the browser, which shows it as a card, and only the user pressing Apply carries it out. So the
// descriptions speak of proposing. The list is fixed on the server, so a page can't hand Claude
// tools of its own, and it never changes within a conversation, as preserved thinking requires.

const DATE = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'A day, as YYYY-MM-DD' };
const TIME = { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', description: 'A time of day, as HH:MM in 24-hour time' };
const ID = { type: 'integer', minimum: 1 };
const TEXT = (description, maxLength = 200) => ({ type: 'string', minLength: 1, maxLength, description });
const PRIORITY = { type: 'string', enum: ['low', 'medium', 'high'] };
const TAGS = {
  type: 'array',
  maxItems: 10,
  items: { type: 'string', pattern: '^[^\\s#,]{1,30}$' },
  description: 'Tags, lower case, without the #',
};

export const ASSISTANT_TOOLS = [
  {
    name: 'add_tasks',
    description:
      'Propose adding tasks to the task list. Use it whenever the user asks to add, capture or plan work, or to break a task into steps (then set parent_id to that task). Give each task a short imperative text; set due_date, priority and tags only when the user said so or the context makes them clear.',
    input_schema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          minItems: 1,
          maxItems: 20,
          items: {
            type: 'object',
            properties: {
              text: TEXT('What to do, as a short imperative line'),
              priority: PRIORITY,
              due_date: DATE,
              tags: TAGS,
              parent_id: { ...ID, description: 'The id of an open task (not itself a step) to add this under, as a step' },
            },
            required: ['text'],
          },
        },
      },
      required: ['tasks'],
    },
  },
  {
    name: 'update_task',
    description:
      'Propose changing one task: its text, priority, tags, or due date (null clears it). Use it to reschedule, reprioritise, rename or retag a task the user points to. Include only the fields that change.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { ...ID, description: 'The task’s id from the dashboard snapshot' },
        text: TEXT('The new text'),
        priority: PRIORITY,
        due_date: { ...DATE, type: ['string', 'null'], description: 'The new due day as YYYY-MM-DD, or null for no date' },
        tags: TAGS,
      },
      required: ['task_id'],
    },
  },
  {
    name: 'complete_task',
    description: 'Propose ticking off an open task the user says is done.',
    input_schema: {
      type: 'object',
      properties: { task_id: { ...ID, description: 'The task’s id from the dashboard snapshot' } },
      required: ['task_id'],
    },
  },
  {
    name: 'add_event',
    description:
      'Propose adding an event to the calendar: something that happens at a time or on a day (a meeting, an appointment), as opposed to a task to do. Leave out start for an all-day event.',
    input_schema: {
      type: 'object',
      properties: {
        title: TEXT('What the event is'),
        date: DATE,
        start: TIME,
        end: { ...TIME, description: 'When it ends, as HH:MM; only with a start' },
      },
      required: ['title', 'date'],
    },
  },
  {
    name: 'log_habit',
    description: 'Propose ticking off a habit as done, today unless the user names another day.',
    input_schema: {
      type: 'object',
      properties: {
        habit_id: { ...ID, description: 'The habit’s id from the dashboard snapshot' },
        date: DATE,
      },
      required: ['habit_id'],
    },
  },
  {
    name: 'start_focus',
    description: 'Propose starting a focus session on the focus timer, linked to a task when the user names one.',
    input_schema: {
      type: 'object',
      properties: { task_id: { ...ID, description: 'The task to focus on, from the dashboard snapshot' } },
    },
  },
  {
    name: 'append_note',
    description: 'Propose adding text to the end of the user’s notes. Use it when the user asks to note, jot down or remember something that isn’t a task.',
    input_schema: {
      type: 'object',
      properties: { text: TEXT('The text to add', 4000) },
      required: ['text'],
    },
  },
].map((tool) => ({ ...tool, eager_input_streaming: true })); // inputs are checked below, so they may stream as written

export const TOOL_NAMES = new Set(ASSISTANT_TOOLS.map((tool) => tool.name));

const typeOf = (value) => (value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value);
const matches = (type, value) => {
  const actual = typeOf(value);
  return actual === type || (type === 'number' && actual === 'integer');
};

// Checks a value against the small part of JSON Schema the tools use, and returns it with any
// properties the schema doesn't know left out. Throws an Error naming the first problem.
function check(schema, value, path) {
  const types = [].concat(schema.type);
  if (!types.some((type) => matches(type, value))) throw new Error(`${path} should be ${types.join(' or ')}`);
  if (value === null) return value;
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path} should be one of ${schema.enum.join(', ')}`);
  if (typeof value === 'string') {
    if (schema.minLength && value.trim().length < schema.minLength) throw new Error(`${path} is empty`);
    if (schema.maxLength && value.length > schema.maxLength) throw new Error(`${path} is too long`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) throw new Error(`${path} is not in the right form`);
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) throw new Error(`${path} is too small`);
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) throw new Error(`${path} needs at least ${schema.minItems}`);
    if (schema.maxItems && value.length > schema.maxItems) throw new Error(`${path} has more than ${schema.maxItems}`);
    return value.map((item, i) => check(schema.items, item, `${path}[${i}]`));
  }
  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) if (value[key] === undefined) throw new Error(`${path}.${key} is missing`);
    const out = {};
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (value[key] !== undefined) out[key] = check(sub, value[key], `${path}.${key}`);
    }
    return out;
  }
  return value;
}

// Whether a tool call's input is something the dashboard can show and apply.
// Returns { input } with the input tidied, or { error } saying what is wrong with it.
export function checkToolInput(name, input) {
  const tool = ASSISTANT_TOOLS.find((t) => t.name === name);
  if (!tool) return { error: `There is no ${name} tool.` };
  try {
    const tidy = check(tool.input_schema, input, 'input');
    if (name === 'add_event' && tidy.end && (!tidy.start || tidy.end <= tidy.start)) {
      throw new Error('input.end should come after input.start');
    }
    if (name === 'update_task' && Object.keys(tidy).length === 1) throw new Error('input changes nothing');
    return { input: tidy };
  } catch (error) {
    return { error: `The proposal could not be read: ${error.message}.` };
  }
}
