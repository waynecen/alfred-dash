import Anthropic from '@anthropic-ai/sdk';
import { createHash, timingSafeEqual } from 'node:crypto';
import { ASSISTANT_TOOLS, TOOL_NAMES, checkToolInput } from './assistantTools.js';

// The dashboard's door to Claude. The browser never sees the API key: it sends a conversation
// here, and this code (running in Node, next to the key) calls the Anthropic API and streams the
// reply back as Server-Sent Events.
//
//   GET  /api/ai/health   -> { configured, model, locked? }   (locked: hosted, without the access key)
//   POST /api/ai/stream   { messages: [{ role, content }], system?, effort?, tools? }
//        -> text/event-stream of:
//           event: status    data: { phase: 'thinking' | 'writing' | 'proposing' }
//           event: text      data: { text }               (a piece of the reply)
//           event: tool_use  data: { id, name, input, error? }   (with tools: a proposed change)
//           event: done      data: { stopReason, model, usage, refusal?, content? }
//           event: error     data: { message, status? }
//
// With tools: true, Claude may propose changes with the assistant's tools (assistantTools.js).
// They reach the browser only once the reply is complete, each checked against its tool, and the
// done event carries the reply's content blocks for the browser to send back next turn, unchanged.
//
// The model, token ceiling and tools are chosen here, not by the browser, so a page can't run up
// the bill with a bigger model or hand Claude tools of its own.

export const DEFAULT_MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 64000; // streaming, so a high ceiling can't time out; you pay only for what is used
const EFFORTS = ['low', 'medium', 'high'];
const DEFAULT_EFFORT = 'medium';

// Limits on what the browser may send, so a bad or hostile request can't make a huge call.
const MAX_BODY_BYTES = 1024 * 1024; // a long chat sends back its thinking blocks and snapshots
const MAX_MESSAGES = 100;
const MAX_SYSTEM_CHARS = 20000;
// At most this many replies stream at once, so a page stuck in a loop can't run up the bill.
const MAX_CONCURRENT_STREAMS = 3;

// Haiku has no server-side fallback; the other current models re-run a request that their safety
// classifiers wrongly decline on Anthropic's recommended fallback model, instead of failing.
const supportsFallback = (model) => !model.startsWith('claude-haiku');

// Who may use the proxy, which spends your API credit:
//   on this computer (npm run dev): pages served from this computer, as before; the Host check
//     stops DNS-rebinding tricks, the Origin check other websites open in the same browser
//   hosted (on Vercel): only pages from the same site, and only with the access key the site's
//     owner set (AI_ACCESS_KEY). With no key set, a hosted proxy stays shut.
// Returns 'ok', 'forbidden' (another website) or 'locked' (no access key, or the wrong one).
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
export const ACCESS_HEADER = 'x-dashboard-key';

function originHost(req) {
  const origin = req.headers.origin;
  if (!origin) return null; // same-origin GETs and non-browser tools such as curl
  try {
    return new URL(origin).host;
  } catch {
    return '';
  }
}

// Compares two secrets in the same time whatever they are, so timing gives nothing away.
const digest = (text) => createHash('sha256').update(text).digest();
const sameSecret = (a, b) => timingSafeEqual(digest(a), digest(b));

function checkAccess(req, accessKey) {
  const host = req.headers.host ?? '';
  const from = originHost(req);
  if (LOCAL_HOST.test(host)) return from === null || LOCAL_HOST.test(from) ? 'ok' : 'forbidden';
  if (from !== null && from !== host) return 'forbidden';
  const given = req.headers[ACCESS_HEADER];
  return accessKey && typeof given === 'string' && sameSecret(given, accessKey) ? 'ok' : 'locked';
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request is too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const isText = (value) => typeof value === 'string';
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// One content block from the browser, rebuilt from only the fields it may carry. A user sends
// text, and with tools the results of the proposals Claude made; an assistant turn comes back as
// it was sent out (text, thinking, tool calls).
function parseBlock(role, block, tools) {
  switch (`${role}:${block?.type}`) {
    case 'user:text':
    case 'assistant:text':
      if (!isText(block.text) || !block.text.trim()) throw badRequest('A text block needs text.');
      return { type: 'text', text: block.text };
    case 'assistant:thinking':
      if (!isText(block.thinking) || !isText(block.signature)) throw badRequest('A thinking block needs its text and signature.');
      return { type: 'thinking', thinking: block.thinking, signature: block.signature };
    case 'assistant:redacted_thinking':
      if (!isText(block.data)) throw badRequest('A redacted thinking block needs its data.');
      return { type: 'redacted_thinking', data: block.data };
    case 'assistant:tool_use':
      if (!tools) throw badRequest('Tool calls need tools: true.');
      if (!isText(block.id) || !TOOL_NAMES.has(block.name) || !isObject(block.input)) {
        throw badRequest('A tool call needs an id, one of the assistant’s tools, and an input object.');
      }
      return { type: 'tool_use', id: block.id, name: block.name, input: block.input };
    case 'user:tool_result':
      if (!tools) throw badRequest('Tool results need tools: true.');
      if (!isText(block.tool_use_id) || !isText(block.content) || !block.content.trim()) {
        throw badRequest('A tool result needs the tool_use_id it answers and some text.');
      }
      return { type: 'tool_result', tool_use_id: block.tool_use_id, content: block.content, ...(block.is_error === true && { is_error: true }) };
    default:
      throw badRequest(`A ${role} message can't hold a ${block?.type} block.`);
  }
}

function parseContent(role, content, tools) {
  if (isText(content)) {
    if (!content.trim()) throw badRequest('Each content must be non-empty.');
    return content;
  }
  if (!Array.isArray(content) || content.length === 0) throw badRequest('Each content must be text or a non-empty list of blocks.');
  return content.map((block) => parseBlock(role, block, tools));
}

// Checks the browser's request and returns the API parameters, or throws a 400 with the reason.
export function parseStreamRequest(raw) {
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw badRequest('Body must be JSON.');
  }
  const { messages, system, effort = DEFAULT_EFFORT, tools = false } = body ?? {};

  if (typeof tools !== 'boolean') throw badRequest('tools must be true or false.');
  if (!Array.isArray(messages) || messages.length === 0) throw badRequest('messages must be a non-empty array.');
  if (messages.length > MAX_MESSAGES) throw badRequest(`At most ${MAX_MESSAGES} messages.`);
  for (const message of messages) {
    if (message?.role !== 'user' && message?.role !== 'assistant') throw badRequest('Each role must be "user" or "assistant".');
  }
  if (messages[0].role !== 'user') throw badRequest('The first message must be from the user.');
  if (messages.at(-1).role !== 'user') throw badRequest('The last message must be from the user.');
  if (system !== undefined && (!isText(system) || system.length > MAX_SYSTEM_CHARS)) {
    throw badRequest(`system must be text of at most ${MAX_SYSTEM_CHARS} characters.`);
  }
  if (!EFFORTS.includes(effort)) throw badRequest(`effort must be one of ${EFFORTS.join(', ')}.`);

  return {
    messages: messages.map(({ role, content }) => ({ role, content: parseContent(role, content, tools) })),
    system: system || undefined,
    effort,
    tools,
  };
}

// What of a finished reply goes back to the API next turn, as the browser will send it. Blocks
// are kept as they came, but only those the conversation can carry, and no empty text. When a
// fallback model took over partway (a fallback block marks where), only the text from before
// that point stays: the declined model's thinking and tool calls are left out.
export function replayable(content) {
  const boundary = content.findLastIndex((block) => block.type === 'fallback');
  const kept = boundary === -1 ? content : [...content.slice(0, boundary).filter((b) => b.type === 'text'), ...content.slice(boundary + 1)];
  return kept.flatMap((block) => {
    switch (block.type) {
      case 'text':
        return block.text.trim() ? [{ type: 'text', text: block.text }] : [];
      case 'thinking':
        return [{ type: 'thinking', thinking: block.thinking, signature: block.signature }];
      case 'redacted_thinking':
        return [{ type: 'redacted_thinking', data: block.data }];
      case 'tool_use':
        return [{ type: 'tool_use', id: block.id, name: block.name, input: block.input }];
      default:
        return [];
    }
  });
}

// Why the tool calls in a reply can't be carried out as they stand, if they can't.
function cutShort(stopReason) {
  if (stopReason === 'max_tokens') return 'The reply was cut off before this proposal was complete.';
  if (stopReason === 'refusal') return 'The reply was declined, so this proposal was not finished.';
  return null;
}

// A short message the dashboard can show, without leaking anything sensitive.
function describeError(error) {
  if (error instanceof Anthropic.AuthenticationError) return { status: 401, message: 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.' };
  if (error instanceof Anthropic.PermissionDeniedError) return { status: 403, message: 'This API key cannot use the configured model.' };
  if (error instanceof Anthropic.RateLimitError) return { status: 429, message: 'Rate limited by the Anthropic API. Try again in a moment.' };
  if (error instanceof Anthropic.BadRequestError) return { status: 400, message: `The Anthropic API rejected the request: ${error.message}` };
  if (error instanceof Anthropic.APIConnectionError) return { status: 502, message: 'Could not reach the Anthropic API. Check your connection.' };
  if (error instanceof Anthropic.APIError) return { status: error.status ?? 502, message: 'The Anthropic API had a problem. Try again.' };
  // A proposal's input streams as it is written; one that ends up as broken JSON can't be read.
  if (error instanceof SyntaxError) return { status: 502, message: 'A proposed change came back garbled. Try again.' };
  return { status: 500, message: 'Something went wrong in the AI proxy.' };
}

// Builds the request handler. Works as plain Node `http` handler or as Connect/Vite middleware
// (it calls next() for paths that are not under /api/ai).
//   apiKey: the Anthropic key (from .env); without it, health says not configured
//   model: which model to use (default Claude Opus 5.5)
//   client: an Anthropic client, injectable for tests
//   accessKey: what a hosted page must send (AI_ACCESS_KEY); not needed on this computer
export function createAiHandler({ apiKey, model = DEFAULT_MODEL, client, accessKey } = {}) {
  const configured = Boolean(client || apiKey);
  const anthropic = client ?? (apiKey ? new Anthropic({ apiKey }) : null);
  let active = 0; // streams in progress

  async function stream(req, res) {
    let params;
    try {
      params = parseStreamRequest(await readBody(req));
    } catch (error) {
      sendJson(res, error.status ?? 400, { error: error.message });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    const request = {
      model,
      max_tokens: MAX_TOKENS,
      messages: params.messages,
      ...(params.system && { system: params.system }),
      output_config: { effort: params.effort },
      ...(params.tools && { tools: ASSISTANT_TOOLS }),
      ...(supportsFallback(model) && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }),
    };
    // The user closed the widget or pressed Stop: stop paying for tokens nobody will read.
    let call;
    let finished = false;
    res.on('close', () => {
      if (!finished) call?.abort();
    });

    try {
      call = anthropic.beta.messages.stream(request);
      for await (const event of call) {
        if (event.type === 'content_block_start') {
          const { type } = event.content_block;
          if (type === 'thinking') send('status', { phase: 'thinking' });
          if (type === 'text') send('status', { phase: 'writing' });
          if (type === 'tool_use') send('status', { phase: 'proposing' });
        } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          send('text', { text: event.delta.text });
        }
      }
      const message = await call.finalMessage();
      const content = params.tools ? replayable(message.content ?? []) : undefined;
      // Each proposal, checked. One cut short by the reply's end still goes to the browser, marked,
      // so its answer (an error) keeps the conversation whole.
      const unfinished = cutShort(message.stop_reason);
      for (const block of content ?? []) {
        if (block.type !== 'tool_use') continue;
        const checked = unfinished ? { error: unfinished } : checkToolInput(block.name, block.input);
        send('tool_use', { id: block.id, name: block.name, input: checked.input ?? block.input, ...(checked.error && { error: checked.error }) });
      }
      send('done', {
        stopReason: message.stop_reason,
        model: message.model, // differs from the configured one when a fallback answered
        usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
        ...(message.stop_reason === 'refusal' && { refusal: message.stop_details?.category ?? null }),
        ...(content && { content }),
      });
    } catch (error) {
      if (res.destroyed) return; // the browser went away; nothing to tell it
      send('error', describeError(error));
    } finally {
      finished = true;
      if (!res.destroyed) res.end();
    }
  }

  return async function aiHandler(req, res, next) {
    const path = (req.url ?? '').split('?')[0];
    if (!path.startsWith('/api/ai/')) {
      if (next) next();
      else sendJson(res, 404, { error: 'Not found.' });
      return;
    }
    const access = checkAccess(req, accessKey);
    if (access === 'forbidden') {
      sendJson(res, 403, { error: 'The AI proxy only answers the dashboard’s own pages.' });
      return;
    }

    if (path === '/api/ai/health' && req.method === 'GET') {
      // Locked, it says only that: not even which model is behind it.
      sendJson(res, 200, access === 'locked' ? { configured, model: null, locked: true } : { configured, model });
      return;
    }
    if (access === 'locked') {
      sendJson(res, 401, { error: 'This site’s AI needs its access key: enter it in Settings.', locked: true });
      return;
    }
    if (path === '/api/ai/stream' && req.method === 'POST') {
      if (!(req.headers['content-type'] ?? '').startsWith('application/json')) {
        sendJson(res, 415, { error: 'Send JSON (Content-Type: application/json).' });
        return;
      }
      if (!anthropic) {
        sendJson(res, 503, { error: 'The AI assistant is not set up: add ANTHROPIC_API_KEY to .env and restart.' });
        return;
      }
      if (active >= MAX_CONCURRENT_STREAMS) {
        sendJson(res, 429, { error: 'Too many AI requests at once. Wait for one to finish.' });
        return;
      }
      active++;
      try {
        await stream(req, res);
      } finally {
        active--;
      }
      return;
    }
    sendJson(res, 404, { error: 'Not found.' });
  };
}
