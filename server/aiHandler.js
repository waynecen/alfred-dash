import Anthropic from '@anthropic-ai/sdk';

// The dashboard's door to Claude. The browser never sees the API key: it sends a conversation
// here, and this code (running in Node, next to the key) calls the Anthropic API and streams the
// reply back as Server-Sent Events.
//
//   GET  /api/ai/health   -> { configured, model }
//   POST /api/ai/stream   { messages: [{ role, content }], system?, effort? }
//        -> text/event-stream of:
//           event: status  data: { phase: 'thinking' | 'writing' }
//           event: text    data: { text }                 (a piece of the reply)
//           event: done    data: { stopReason, model, usage, refusal? }
//           event: error   data: { message, status? }
//
// The model and token ceiling are chosen here, not by the browser, so a page can't run up the
// bill with a bigger model.

export const DEFAULT_MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 64000; // streaming, so a high ceiling can't time out; you pay only for what is used
const EFFORTS = ['low', 'medium', 'high'];
const DEFAULT_EFFORT = 'medium';

// Limits on what the browser may send, so a bad or hostile request can't make a huge call.
const MAX_BODY_BYTES = 256 * 1024;
const MAX_MESSAGES = 100;
const MAX_SYSTEM_CHARS = 20000;
// At most this many replies stream at once, so a page stuck in a loop can't run up the bill.
const MAX_CONCURRENT_STREAMS = 3;

// Haiku has no server-side fallback; the other current models re-run a request that their safety
// classifiers wrongly decline on Anthropic's recommended fallback model, instead of failing.
const supportsFallback = (model) => !model.startsWith('claude-haiku');

// Only pages served from this machine may call the proxy. Checking Host stops DNS-rebinding
// tricks; checking Origin stops other websites open in the same browser.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
function isLocalRequest(req) {
  if (!LOCAL_HOST.test(req.headers.host ?? '')) return false;
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin GETs and non-browser tools such as curl
  try {
    return LOCAL_HOST.test(new URL(origin).host);
  } catch {
    return false;
  }
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

// Checks the browser's request and returns the API parameters, or throws a 400 with the reason.
export function parseStreamRequest(raw) {
  const bad = (message) => Object.assign(new Error(message), { status: 400 });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw bad('Body must be JSON.');
  }
  const { messages, system, effort = DEFAULT_EFFORT } = body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) throw bad('messages must be a non-empty array.');
  if (messages.length > MAX_MESSAGES) throw bad(`At most ${MAX_MESSAGES} messages.`);
  for (const message of messages) {
    if (message?.role !== 'user' && message?.role !== 'assistant') throw bad('Each role must be "user" or "assistant".');
    if (typeof message.content !== 'string' || !message.content.trim()) throw bad('Each content must be non-empty text.');
  }
  if (messages[0].role !== 'user') throw bad('The first message must be from the user.');
  if (messages.at(-1).role !== 'user') throw bad('The last message must be from the user.');
  if (system !== undefined && (typeof system !== 'string' || system.length > MAX_SYSTEM_CHARS)) {
    throw bad(`system must be text of at most ${MAX_SYSTEM_CHARS} characters.`);
  }
  if (!EFFORTS.includes(effort)) throw bad(`effort must be one of ${EFFORTS.join(', ')}.`);

  return {
    messages: messages.map(({ role, content }) => ({ role, content })),
    system: system || undefined,
    effort,
  };
}

// A short message the dashboard can show, without leaking anything sensitive.
function describeError(error) {
  if (error instanceof Anthropic.AuthenticationError) return { status: 401, message: 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.' };
  if (error instanceof Anthropic.PermissionDeniedError) return { status: 403, message: 'This API key cannot use the configured model.' };
  if (error instanceof Anthropic.RateLimitError) return { status: 429, message: 'Rate limited by the Anthropic API. Try again in a moment.' };
  if (error instanceof Anthropic.BadRequestError) return { status: 400, message: `The Anthropic API rejected the request: ${error.message}` };
  if (error instanceof Anthropic.APIConnectionError) return { status: 502, message: 'Could not reach the Anthropic API. Check your connection.' };
  if (error instanceof Anthropic.APIError) return { status: error.status ?? 502, message: 'The Anthropic API had a problem. Try again.' };
  return { status: 500, message: 'Something went wrong in the AI proxy.' };
}

// Builds the request handler. Works as plain Node `http` handler or as Connect/Vite middleware
// (it calls next() for paths that are not under /api/ai).
//   apiKey: the Anthropic key (from .env); without it, health says not configured
//   model: which model to use (default Claude Opus 5.5)
//   client: an Anthropic client, injectable for tests
export function createAiHandler({ apiKey, model = DEFAULT_MODEL, client } = {}) {
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
          if (event.content_block.type === 'thinking') send('status', { phase: 'thinking' });
          if (event.content_block.type === 'text') send('status', { phase: 'writing' });
        } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          send('text', { text: event.delta.text });
        }
      }
      const message = await call.finalMessage();
      send('done', {
        stopReason: message.stop_reason,
        model: message.model, // differs from the configured one when a fallback answered
        usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
        ...(message.stop_reason === 'refusal' && { refusal: message.stop_details?.category ?? null }),
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
    if (!isLocalRequest(req)) {
      sendJson(res, 403, { error: 'The AI proxy only accepts requests from this computer.' });
      return;
    }

    if (path === '/api/ai/health' && req.method === 'GET') {
      sendJson(res, 200, { configured, model });
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
