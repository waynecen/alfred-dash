import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AssistantWidget from './AssistantWidget';
import { SYSTEM_PROMPT } from '../../hooks/useAssistant';

// The AI proxy's stream, as server-sent events.
const sse = (...events) =>
  new Response(events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join(''), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
const reply = (text, ...calls) =>
  sse(
    ['text', { text }],
    ...calls.map((call) => ['tool_use', call]),
    [
      'done',
      {
        stopReason: calls.length ? 'tool_use' : 'end_turn',
        model: 'claude-opus-5-5',
        content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'text', text }, ...calls.map((call) => ({ type: 'tool_use', ...call }))],
      },
    ]
  );
const addMilk = { id: 'toolu_1', name: 'add_tasks', input: { tasks: [{ text: 'Buy milk' }] } };
const note = { id: 'toolu_2', name: 'append_note', input: { text: 'Call Sam' } };

const data = { tasks: [], events: [], habits: [], habitLog: {}, goals: [], focus: { phase: 'idle', minutesToday: 0 }, notes: '' };

function setup(responses) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  const notify = vi.fn();
  const actions = {
    addTasks: vi.fn(() => [101]),
    // Notes saved the way the dashboard saves them, so Undo has something real to put back.
    setNotes: vi.fn((update) => localStorage.setItem('notes', JSON.stringify(update(JSON.parse(localStorage.getItem('notes') ?? '""'))))),
  };
  render(<AssistantWidget data={data} actions={actions} notify={notify} />);
  const sent = (n) => JSON.parse(fetchMock.mock.calls[n][1].body);
  return { fetchMock, notify, actions, sent };
}

const input = () => screen.getByLabelText('Message Claude');
const say = (text) => userEvent.type(input(), `${text}{Enter}`);

afterEach(() => vi.unstubAllGlobals());

describe('AssistantWidget', () => {
  it('starts with suggestions, and sends one with a dashboard snapshot, fixed instructions and tools', async () => {
    const { sent } = setup([reply('Do the overdue things first.')]);
    await userEvent.click(screen.getByRole('button', { name: 'What should I focus on today?' }));
    expect(await screen.findByText('Do the overdue things first.')).toBeInTheDocument();
    const body = sent(0);
    expect(body).toMatchObject({ system: SYSTEM_PROMPT, tools: true, effort: 'medium' });
    const [snapshot, question] = body.messages[0].content;
    expect(snapshot.text).toMatch(/^<dashboard>/);
    expect(question).toEqual({ type: 'text', text: 'What should I focus on today?' });
  });

  it('shows a proposal as a card that changes nothing until Apply, and then offers Undo', async () => {
    const { actions, notify } = setup([reply('Here it is.', addMilk)]);
    await say('Add milk');
    expect(await screen.findByText('Add a task')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(actions.addTasks).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Apply: Add a task' }));
    expect(actions.addTasks).toHaveBeenCalledWith([{ text: 'Buy milk', priority: 'medium', dueDate: null, tags: [], parentId: null }]);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'Applied: Add a task', actionLabel: 'Undo' }));
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('tells Claude what became of each proposal with the next message', async () => {
    const { sent } = setup([reply('Two things.', addMilk, note), reply('Noted.')]);
    await say('Milk, and remind me about Sam');
    await screen.findByText('Add to your notes');
    await userEvent.click(screen.getByRole('button', { name: 'Apply: Add to your notes' }));
    await say('Thanks');
    await screen.findByText('Noted.');
    const [skipped, applied] = sent(1).messages[2].content;
    expect(skipped).toEqual({ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Not applied: the user wrote again without applying it.' });
    expect(applied).toEqual({ type: 'tool_result', tool_use_id: 'toolu_2', content: 'Applied. Added to the notes.' });
    // The reply went back exactly as it came, thinking and all.
    expect(sent(1).messages[1].content[0]).toEqual({ type: 'thinking', thinking: '', signature: 'sig' });
    // The card that wasn't applied can't be any more.
    expect(screen.queryByRole('button', { name: 'Apply: Add a task' })).not.toBeInTheDocument();
  });

  it('undoes an applied change by putting the notes back as they were', async () => {
    localStorage.setItem('notes', JSON.stringify('Shopping'));
    setup([reply('Noted.', note)]);
    await say('Remind me about Sam');
    await userEvent.click(await screen.findByRole('button', { name: 'Apply: Add to your notes' }));
    expect(JSON.parse(localStorage.getItem('notes'))).toBe('Shopping\n\nCall Sam');
    await userEvent.click(screen.getByRole('button', { name: 'Undo: Add to your notes' }));
    expect(JSON.parse(localStorage.getItem('notes'))).toBe('Shopping');
    expect(screen.getByText('Undone')).toBeInTheDocument();
  });

  it('applies several proposals at once', async () => {
    const { actions, notify } = setup([reply('Both.', addMilk, note)]);
    await say('Both please');
    await userEvent.click(await screen.findByRole('button', { name: 'Apply all 2' }));
    expect(actions.addTasks).toHaveBeenCalled();
    expect(actions.setNotes).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'Applied 2 changes' }));
  });

  it('gives the question back when it couldn’t be sent, and leaves the chat as it was', async () => {
    setup([new Response(JSON.stringify({ error: 'Rate limited.' }), { status: 429, headers: { 'Content-Type': 'application/json' } })]);
    await say('Hello?');
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t send: Rate limited.');
    await waitFor(() => expect(input()).toHaveValue('Hello?'));
    expect(JSON.parse(localStorage.getItem('assistantHistory')).messages).toEqual([]);
  });

  it('carries a long chat on from a recap, with no earlier thinking', async () => {
    const turns = Array.from({ length: 20 }, (_, i) => [
      { role: 'user', content: [{ type: 'text', text: '<dashboard>…</dashboard>' }, { type: 'text', text: `Question ${i}` }] },
      { role: 'assistant', content: [{ type: 'thinking', thinking: '', signature: `s${i}` }, { type: 'text', text: `Answer ${i}` }] },
    ]).flat();
    localStorage.setItem('assistantHistory', JSON.stringify({ messages: turns, actions: {} }));
    const { sent } = setup([reply('Sure.')]);
    await say('One more');
    await screen.findByText('Sure.');
    const { messages } = sent(0);
    expect(messages).toHaveLength(1);
    expect(messages[0].content[0].text).toMatch(/^\(Earlier in this chat, in brief\)\nUser: Question 16/);
    expect(JSON.stringify(messages)).not.toContain('signature');
    expect(screen.getByText('Earlier messages, summarised')).toBeInTheDocument();
  });

  it('clears the chat, with Undo', async () => {
    const { notify } = setup([reply('Hi.')]);
    await say('Hello');
    await screen.findByText('Hi.');
    await userEvent.click(screen.getByRole('button', { name: 'Clear chat' }));
    expect(screen.queryByText('Hi.')).not.toBeInTheDocument();
    const { onAction } = notify.mock.calls.at(-1)[0];
    onAction();
    expect(await screen.findByText('Hi.')).toBeInTheDocument();
  });
});
