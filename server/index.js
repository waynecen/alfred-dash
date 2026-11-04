// Runs the AI proxy on its own, for `npm run preview` or a production build served elsewhere.
// (`npm run dev` doesn't need this: the Vite dev server mounts the same handler itself.)
//   npm run api        listens on http://127.0.0.1:8787 and reads .env if there is one
import http from 'node:http';
import { createAiHandler, DEFAULT_MODEL } from './aiHandler.js';

const port = Number(process.env.AI_PROXY_PORT ?? 8787);
const handler = createAiHandler({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
});

// 127.0.0.1 only: the proxy spends your API credit, so it is never reachable from the network.
http.createServer(handler).listen(port, '127.0.0.1', () => {
  const key = process.env.ANTHROPIC_API_KEY ? 'key loaded' : 'no ANTHROPIC_API_KEY, so AI calls are off';
  console.log(`AI proxy on http://127.0.0.1:${port} (${key})`);
});
