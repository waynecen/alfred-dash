import { useCallback, useEffect, useRef, useState } from 'react';
import useLocalStorage, { readSaved, restoreSaved } from './useLocalStorage';
import { useAI } from './useAI';
import { actionFor } from '../utils/assistantActions';
import { plural } from '../utils/text';

// The instructions stay the same for the whole conversation, with nothing in them that changes
// (no date, no dashboard): Claude's earlier thinking is only valid while everything before it is
// unchanged. What changes comes with each message instead, as a snapshot of the dashboard.
export const SYSTEM_PROMPT = `You are the assistant built into a personal dashboard: a task list (due dates, priorities, tags, steps under tasks), a calendar of events, habits, goals, a focus timer and a notepad. Each user message begins with a <dashboard> snapshot of how things stand at that moment; the newest snapshot is the truth, whatever earlier messages said.

You can propose changes with your tools. A proposal changes nothing by itself: the user sees each one as a card and applies or dismisses it, and their next message tells you which. So:
- When the user asks for a change, propose it with the tools, and keep your text to a sentence about what you proposed. Don't ask for permission first; the card is the confirmation.
- Use the ids in the snapshot. Never invent an id, a task or a fact. If it isn't clear which task, habit or day the user means, ask instead of guessing.
- Write dates as YYYY-MM-DD and times as HH:MM (24-hour), worked out from the date in the snapshot.
- Don't propose a change that is already true, and don't repeat a proposal the user dismissed unless they ask again.

When the user asks a question, answer from the snapshot, briefly, in plain text: "- " for lists, and no other Markdown.`;

// Past this many messages the chat goes on from a short recap, in plain text and with no earlier
// thinking, which the API allows where dropping the oldest turns wouldn't be; it also keeps each
// request small.
const MAX_MESSAGES = 40;
const RECAP_MESSAGES = 8;
const RECAP_MARK = '(Earlier in this chat, in brief)';
const EMPTY = { messages: [], actions: {} };

// What each answer tells Claude about a proposal, by what became of it.
const RESULTS = {
  applied: (action) => `Applied. ${action.note}`,
  undone: () => 'Applied, then undone by the user: nothing is changed now.',
  dismissed: () => 'Dismissed by the user; nothing was changed.',
  skipped: () => 'Not applied: the user wrote again without applying it.',
  failed: (action) => `Not applied: ${action.note}`,
  invalid: (action) => action.note,
};

// The text the user typed into a message: its last text block (the snapshot comes first).
export function questionOf(message) {
  if (typeof message.content === 'string') return message.content;
  const texts = message.content.filter((block) => block.type === 'text');
  return texts.at(-1)?.text ?? '';
}

// What Claude said in a reply, in order.
export const replyText = (message) =>
  message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n\n');

export const isRecap = (message) => message.role === 'user' && Array.isArray(message.content) && message.content[0]?.text?.startsWith(RECAP_MARK);

// The last few turns in a few plain lines, to carry a long chat over into a fresh one.
function recapOf(messages, actions) {
  const lines = messages.slice(-RECAP_MESSAGES).flatMap((message) => {
    if (message.role === 'user') {
      const text = isRecap(message) ? '' : questionOf(message);
      return text ? [`User: ${text.slice(0, 400)}`] : [];
    }
    const proposals = message.content
      .filter((block) => block.type === 'tool_use')
      .map((block) => `${block.name} (${actions[block.id]?.status ?? 'pending'})`);
    const text = replyText(message);
    return [`You: ${text.slice(0, 400)}${proposals.length ? ` [proposed: ${proposals.join(', ')}]` : ''}`];
  });
  return `${RECAP_MARK}\n${lines.join('\n')}`;
}

// The assistant's conversation, kept between visits, and everything that can happen in it.
//   getContext(): the dashboard snapshot to send with the next message
//   data: what proposals are checked against (see assistantActions.js)
//   actions: the dashboard's actions, to carry proposals out with
//   notify: shows a toast
// Returns { chat, ai, ask, apply, dismiss, undo, canUndo, clear, restoredQuestion }:
//   ask(text) sends a message; it returns false when it can't (nothing typed, a reply on its way)
//   restoredQuestion: { text, n } after a message failed to send, to put back in the input
function useAssistant({ getContext, data, actions, notify }) {
  const [chat, setChat] = useLocalStorage('assistantHistory', EMPTY);
  const ai = useAI();
  // Undo for what was applied in this visit, by proposal id; the snapshots aren't saved.
  const undos = useRef(new Map());
  const [, setUndoCount] = useState(0);
  // The chat as it was before the message on its way, to go back to if it fails.
  const beforeAsk = useRef(null);
  const [restoredQuestion, setRestoredQuestion] = useState(null);
  const handled = useRef(null);

  const setStatus = useCallback(
    (changes) =>
      setChat((current) => ({
        ...current,
        actions: { ...current.actions, ...Object.fromEntries(changes.map(([id, change]) => [id, { ...current.actions[id], ...change }])) },
      })),
    [setChat]
  );

  function ask(question) {
    const text = question.trim();
    if (!text || ai.busy) return false;
    const last = chat.messages.at(-1);
    const proposals = last?.role === 'assistant' ? last.content.filter((block) => block.type === 'tool_use') : [];
    // Proposals still waiting are answered as passed over: the user moved on without them.
    const statuses = { ...chat.actions };
    for (const block of proposals) {
      if ((statuses[block.id]?.status ?? 'pending') === 'pending') statuses[block.id] = { ...statuses[block.id], status: 'skipped' };
    }
    const results = proposals.map((block) => {
      const action = statuses[block.id] ?? { status: 'invalid', note: 'The proposal was lost.' };
      return {
        type: 'tool_result',
        tool_use_id: block.id,
        content: (RESULTS[action.status] ?? RESULTS.invalid)(action),
        ...(['failed', 'invalid'].includes(action.status) && { is_error: true }),
      };
    });
    const snapshot = { type: 'text', text: getContext() };
    const typed = { type: 'text', text };

    let messages = [...chat.messages, { role: 'user', content: [...results, snapshot, typed] }];
    if (messages.length > MAX_MESSAGES) {
      // Start again from a recap. The proposals' answers go with the turns they answered.
      messages = [{ role: 'user', content: [{ type: 'text', text: recapOf(chat.messages, statuses) }, snapshot, typed] }];
    }
    beforeAsk.current = { chat, text };
    handled.current = null;
    setChat({ messages, actions: statuses });
    ai.send({ system: SYSTEM_PROMPT, messages, tools: true, effort: 'medium' });
    return true;
  }

  // A finished reply joins the chat with its proposals. A failed send puts the chat back as it
  // was and hands the question back; a stopped one keeps the text written so far.
  useEffect(() => {
    if (handled.current === ai.status || !beforeAsk.current) return;
    if (ai.status === 'done' || ai.status === 'refused') {
      handled.current = ai.status;
      const content = ai.result?.content ?? [];
      const proposals = ai.toolCalls ?? [];
      beforeAsk.current = null;
      setChat((current) => ({
        messages: content.length ? [...current.messages, { role: 'assistant', content }] : current.messages,
        actions: {
          ...current.actions,
          ...Object.fromEntries(
            proposals.map((call) => [call.id, { name: call.name, input: call.input, status: call.error ? 'invalid' : 'pending', ...(call.error && { note: call.error }) }])
          ),
        },
      }));
    } else if (ai.status === 'stopped') {
      handled.current = ai.status;
      beforeAsk.current = null;
      if (ai.text.trim()) setChat((current) => ({ ...current, messages: [...current.messages, { role: 'assistant', content: [{ type: 'text', text: `${ai.text.trim()} …` }] }] }));
    } else if (ai.status === 'error') {
      handled.current = ai.status;
      const { chat: previous, text } = beforeAsk.current;
      beforeAsk.current = null;
      setChat(previous);
      setRestoredQuestion((current) => ({ text, n: (current?.n ?? 0) + 1 }));
    }
  }, [ai.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carries out proposals, with one toast and one Undo for all of them. A proposal that can't be
  // applied as things are now is marked so, with the reason, and the rest still go ahead.
  function apply(ids) {
    const pending = ids.map((id) => [id, chat.actions[id]]).filter(([, action]) => action?.status === 'pending');
    if (!pending.length) return;
    const keys = [...new Set(pending.flatMap(([, action]) => actionFor(action.name)?.keys ?? []))];
    const before = keys.map(readSaved);
    const changes = [];
    const titles = [];
    for (const [id, action] of pending) {
      const spec = actionFor(action.name);
      const problem = spec ? spec.problem(action.input, data) : 'the dashboard doesn’t know this kind of change';
      if (problem) {
        changes.push([id, { status: 'failed', note: problem }]);
        continue;
      }
      // What the card said as it was applied, which is what it keeps saying: described afresh, a
      // change would read against itself ("Due: Tomorrow (was Tomorrow)").
      const shown = spec.describe(action.input, data);
      titles.push(shown.title);
      changes.push([id, { status: 'applied', shown, note: spec.apply(action.input, actions, data) }]);
    }
    const after = keys.map(readSaved);
    setStatus(changes);
    const applied = changes.filter(([, change]) => change.status === 'applied').map(([id]) => id);
    const failed = changes.filter(([, change]) => change.status === 'failed');
    if (!applied.length) {
      notify({ message: `Couldn’t apply: ${failed[0][1].note}` });
      return;
    }
    const undo = () => {
      if (keys.some((key, i) => readSaved(key) !== after[i])) {
        notify({ message: 'That has changed since, so it can’t be undone from here.' });
        return;
      }
      keys.forEach((key, i) => restoreSaved(key, before[i]));
      applied.forEach((id) => undos.current.delete(id));
      setUndoCount((n) => n + 1);
      setStatus(applied.map((id) => [id, { status: 'undone' }]));
    };
    applied.forEach((id) => undos.current.set(id, undo));
    setUndoCount((n) => n + 1);
    const message = applied.length === 1 ? `Applied: ${titles[0]}` : `Applied ${plural(applied.length, 'change')}`;
    notify({ message: failed.length ? `${message}; ${plural(failed.length, 'other')} couldn’t be` : message, actionLabel: 'Undo', onAction: undo });
  }

  const dismiss = (ids) => setStatus(ids.filter((id) => chat.actions[id]?.status === 'pending').map((id) => [id, { status: 'dismissed' }]));

  function clear() {
    const previous = chat;
    ai.reset();
    undos.current.clear();
    beforeAsk.current = null;
    setChat(EMPTY);
    notify({ message: 'Chat cleared', actionLabel: 'Undo', onAction: () => setChat(previous) });
  }

  return {
    chat,
    ai,
    ask,
    apply,
    dismiss,
    undo: (id) => undos.current.get(id)?.(),
    canUndo: (id) => undos.current.has(id),
    clear,
    restoredQuestion,
  };
}

export default useAssistant;
