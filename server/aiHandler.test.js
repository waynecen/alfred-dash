// @vitest-environment node
import http from 'node:http';
import { vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { createAiHandler, parseStreamRequest } from './aiHandler.js';

// A stand-in for the Anthropic client: its stream yields the given events, then a final message.
function fakeClient({ events = [], final = {}, error } = {}) {
  const calls = [];
  const client = {
    beta: {
      messages: {
        stream(request) {
          calls.push(request);
          return {
            abort: vi.fn(),
            async *[Symbol.asyncIterator]() {
              for (const event of events) yield event;
              if (error) throw error;
            },
            finalMessage: async () => ({
              stop_reason: 'end_turn',
              model: request.model,
              usage: { input_tokens: 10, output_tokens: 5 },
              ...final,
            }),
          };
        },
      },
    },
  };
  return { client, calls };
}

const textEvents = (...pieces) => [
  { type: 'content_block_start', content_block: { type: 'text' } },
  ...pieces.map((text) => ({ type: 'content_block_delta', delta: { type: 'text_delta', text } })),
];

let server;
let base;
async function start(options) {
  server = http.createServer(createAiHandler(options));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
afterEach(() => new Promise((resolve) => (server ? server.close(resolve) : resolve())));

const post = (body, headers = {}) =>
  fetch(`${base}/api/ai/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

// Turns an SSE body into [{ event, data }].
const readEvents = async (response) =>
  (await response.text())
    .split('\n\n')
    .filter(Boolean)
    .map((chunk) => {
      const [eventLine, dataLine] = chunk.split('\n');
      return { event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) };
    });

const hello = { messages: [{ role: 'user', content: 'Hello' }] };

describe('AI proxy', () => {
  it('reports whether a key is configured, and the model, without revealing the key', async () => {
    await start({ apiKey: 'sk-ant-secret', model: 'claude-opus-5-5' });
    const response = await fetch(`${base}/api/ai/health`);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ configured: true, model: 'claude-opus-5-5' });
    expect(text).not.toContain('sk-ant-secret');
  });

  it('says it is not configured, and refuses to stream, without a key', async () => {
    await start({});
    expect(await (await fetch(`${base}/api/ai/health`)).json()).toMatchObject({ configured: false });
    const response = await post(hello);
    expect(response.status).toBe(503);
  });

  it('streams the reply as server-sent events', async () => {
    const { client } = fakeClient({ events: textEvents('Hi ', 'there') });
    await start({ client });
    const response = await post(hello);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    expect(await readEvents(response)).toEqual([
      { event: 'status', data: { phase: 'writing' } },
      { event: 'text', data: { text: 'Hi ' } },
      { event: 'text', data: { text: 'there' } },
      {
        event: 'done',
        data: { stopReason: 'end_turn', model: 'claude-opus-5-5', usage: { inputTokens: 10, outputTokens: 5 } },
      },
    ]);
  });

  it('picks the model and limits itself, and opts into refusal fallbacks', async () => {
    const { client, calls } = fakeClient();
    await start({ client });
    await (await post({ ...hello, system: 'Be brief.', effort: 'low' })).text();
    expect(calls[0]).toMatchObject({
      model: 'claude-opus-5-5',
      max_tokens: 64000,
      system: 'Be brief.',
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  });

  it('does not ask for a fallback on Haiku, which has none', async () => {
    const { client, calls } = fakeClient();
    await start({ client, model: 'claude-haiku-5-5' });
    await (await post(hello)).text();
    expect(calls[0]).not.toHaveProperty('fallbacks');
    expect(calls[0]).not.toHaveProperty('betas');
  });

  it('reports a refusal and its category', async () => {
    const { client } = fakeClient({ final: { stop_reason: 'refusal', stop_details: { category: 'cyber' } } });
    await start({ client });
    const events = await readEvents(await post(hello));
    expect(events.at(-1)).toMatchObject({ event: 'done', data: { stopReason: 'refusal', refusal: 'cyber' } });
  });

  it('turns an API failure into a plain error event', async () => {
    const error = new Anthropic.APIConnectionError({ message: 'offline' });
    const { client } = fakeClient({ error });
    await start({ client });
    const events = await readEvents(await post(hello));
    expect(events.at(-1)).toEqual({
      event: 'error',
      data: { status: 502, message: 'Could not reach the Anthropic API. Check your connection.' },
    });
  });

  it('only accepts JSON', async () => {
    await start({ client: fakeClient().client });
    expect((await post('hi', { 'Content-Type': 'text/plain' })).status).toBe(415);
  });

  it('rejects requests from other websites', async () => {
    await start({ client: fakeClient().client });
    const response = await post(hello, { Origin: 'https://evil.example' });
    expect(response.status).toBe(403);
  });

  it('accepts requests from the dashboard page', async () => {
    await start({ client: fakeClient().client });
    const response = await post(hello, { Origin: 'http://localhost:5173' });
    expect(response.status).toBe(200);
    await response.text();
  });

  it('passes other paths on to the next handler', async () => {
    const next = vi.fn();
    const handler = createAiHandler({});
    await handler({ url: '/index.html', headers: {} }, {}, next);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('parseStreamRequest', () => {
  const parse = (body) => parseStreamRequest(JSON.stringify(body));

  it('keeps only role and content, and defaults effort to medium', () => {
    expect(parse({ messages: [{ role: 'user', content: 'Hi', extra: 1 }] })).toEqual({
      messages: [{ role: 'user', content: 'Hi' }],
      system: undefined,
      effort: 'medium',
    });
  });

  it.each([
    ['not JSON', 'nope'],
    ['no messages', JSON.stringify({})],
    ['an unknown role', JSON.stringify({ messages: [{ role: 'system', content: 'x' }] })],
    ['empty content', JSON.stringify({ messages: [{ role: 'user', content: ' ' }] })],
    ['an assistant first', JSON.stringify({ messages: [{ role: 'assistant', content: 'x' }, { role: 'user', content: 'y' }] })],
    ['an assistant last', JSON.stringify({ messages: [{ role: 'user', content: 'x' }, { role: 'assistant', content: 'y' }] })],
    ['an unknown effort', JSON.stringify({ messages: [{ role: 'user', content: 'x' }], effort: 'max' })],
    ['too many messages', JSON.stringify({ messages: Array.from({ length: 101 }, () => ({ role: 'user', content: 'x' })) })],
  ])('rejects %s with a 400', (_name, raw) => {
    expect(() => parseStreamRequest(raw)).toThrow(expect.objectContaining({ status: 400 }));
  });
});
