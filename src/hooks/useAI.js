import { useCallback, useEffect, useRef, useState } from 'react';
import { readEvents } from '../utils/sse';

// Talks to the AI proxy (server/aiHandler.js). The browser never holds an API key: it only sends
// the conversation to /api/ai and reads the streamed reply.

// One check at a time, shared: AI widgets that mount together (and the palette) ask once.
let checking = null;
function checkHealth() {
  checking ??= fetch('/api/ai/health')
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
    .then(({ configured, model }) => ({ status: configured ? 'connected' : 'not-configured', model }))
    .catch(() => ({ status: 'offline', model: null }))
    .finally(() => {
      checking = null;
    });
  return checking;
}

// Whether the proxy is running and has a key.
//   status: 'checking' | 'connected' | 'not-configured' (no key in .env) | 'offline' (no proxy)
//   enabled: only checks while true (e.g. while Settings is open)
export function useAIHealth(enabled = true) {
  const [health, setHealth] = useState({ status: 'checking', model: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let ignore = false;
    setHealth({ status: 'checking', model: null });
    checkHealth().then((result) => !ignore && setHealth(result));
    return () => {
      ignore = true;
    };
  }, [enabled, attempt]);

  const recheck = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...health, recheck };
}

const IDLE = { status: 'idle', text: '', error: null, result: null, toolCalls: [] };

// One streamed AI reply at a time.
//   send({ messages, system?, effort?, tools? }) starts a reply (stopping any reply still running);
//     tools: true lets Claude propose changes with the assistant's tools (see the AI proxy)
//   stop() cancels it; the text so far is kept
//   status: 'idle' | 'thinking' | 'writing' | 'proposing' | 'done' | 'stopped' | 'refused' | 'error'
//   text: the reply so far     error: a message to show when status is 'error'
//   toolCalls: with tools, the changes proposed: [{ id, name, input, error? }], once the reply is done
//   result: { stopReason, model, usage, content? } once done; with tools, content is the reply's
//     blocks, to send back unchanged as the assistant's turn
// `busy` is true while a reply is on its way, for disabling inputs and showing a Stop button.
export function useAI() {
  const [state, setState] = useState(IDLE);
  const controllerRef = useRef(null);

  const stop = useCallback(() => {
    if (!controllerRef.current) return;
    controllerRef.current.abort();
    controllerRef.current = null;
    setState((current) => ({ ...current, status: 'stopped' }));
  }, []);

  const send = useCallback(async ({ messages, system, effort, tools = false }) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const update = (patch) => {
      if (controllerRef.current === controller) setState((current) => ({ ...current, ...patch }));
    };
    setState({ ...IDLE, status: 'thinking' });

    try {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, system, effort, ...(tools && { tools: true }) }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error ?? `The AI proxy answered ${response.status}.`);
      }

      let text = '';
      let toolCalls = [];
      let ended = false;
      await readEvents(response.body, (event, data) => {
        if (event === 'status') update({ status: data.phase });
        else if (event === 'text') {
          text += data.text;
          update({ status: 'writing', text });
        } else if (event === 'tool_use') {
          toolCalls = [...toolCalls, data];
          update({ toolCalls });
        } else if (event === 'done') {
          ended = true;
          update({ status: data.stopReason === 'refusal' ? 'refused' : 'done', result: data });
        } else if (event === 'error') {
          ended = true;
          update({ status: 'error', error: data.message });
        }
      });
      // The stream closed without saying it was finished: the connection dropped mid-reply.
      if (!ended) update({ status: 'error', error: 'The reply was cut off. Try again.' });
    } catch (error) {
      if (controller.signal.aborted) return; // stop() or a newer send() already set the state
      update({
        status: 'error',
        error: error instanceof TypeError ? 'Could not reach the AI proxy. Is `npm run dev` running?' : error.message,
      });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(IDLE);
  }, []);

  // Leaving the page (or unmounting the widget) stops the reply, so nobody pays for unread tokens.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const busy = state.status === 'thinking' || state.status === 'writing' || state.status === 'proposing';
  return { ...state, busy, send, stop, reset };
}
